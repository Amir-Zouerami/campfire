package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
DataRetentionCounts summarizes workspace operational rows affected by a purge.

The counts intentionally separate parent rows from child rows so admins can see
what will disappear even when database foreign keys perform the final cascade.
*/
type DataRetentionCounts struct {
	StandupSubmissions int
	StandupAnswers     int
	LeaveRequests      int
	LeaveDecisions     int
	TimeEntries        int
	ReportRuns         int
	NotificationRuns   int
	AuditLogEntries    int
}

/*
Total returns the total number of rows represented by this summary.
*/
func (c DataRetentionCounts) Total() int {
	return c.StandupSubmissions +
		c.StandupAnswers +
		c.LeaveRequests +
		c.LeaveDecisions +
		c.TimeEntries +
		c.ReportRuns +
		c.NotificationRuns +
		c.AuditLogEntries
}

/*
DataRetentionStore defines destructive retention persistence operations.
*/
type DataRetentionStore interface {
	PreviewWorkspacePurge(ctx context.Context, workspaceID domain.ID, cutoffDate string) (*DataRetentionCounts, error)
	PurgeWorkspaceData(ctx context.Context, workspaceID domain.ID, cutoffDate string) (*DataRetentionCounts, error)
}

/*
SQLDataRetentionStore hard-deletes old operational rows from SQL storage.
*/
type SQLDataRetentionStore struct {
	db *sqlx.DB
}

/*
NewSQLDataRetentionStore creates a SQL data-retention store.
*/
func NewSQLDataRetentionStore(database *Database) *SQLDataRetentionStore {
	return &SQLDataRetentionStore{
		db: database.DB,
	}
}

/*
PreviewWorkspacePurge counts rows older than the cutoff without changing data.
*/
func (s *SQLDataRetentionStore) PreviewWorkspacePurge(
	ctx context.Context,
	workspaceID domain.ID,
	cutoffDate string,
) (*DataRetentionCounts, error) {
	counts, err := s.countWorkspacePurgeRows(ctx, s.db, workspaceID, cutoffDate)
	if err != nil {
		return nil, err
	}

	return counts, nil
}

/*
PurgeWorkspaceData deletes old operational rows in one transaction.

Counts are collected inside the transaction immediately before deletion. Child
rows that are deleted by foreign-key cascades are reported from this pre-delete
snapshot so the result remains understandable to admins.
*/
func (s *SQLDataRetentionStore) PurgeWorkspaceData(
	ctx context.Context,
	workspaceID domain.ID,
	cutoffDate string,
) (*DataRetentionCounts, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin data retention purge transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	counts, err := s.countWorkspacePurgeRows(ctx, tx, workspaceID, cutoffDate)
	if err != nil {
		return nil, err
	}

	if err := s.deleteWorkspacePurgeRows(ctx, tx, workspaceID, cutoffDate); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit data retention purge transaction: %w", err)
	}

	committed = true

	return counts, nil
}

/*
dataRetentionExecutor is the shared SQL shape used by sqlx.DB and sqlx.Tx.
*/
type dataRetentionExecutor interface {
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	Rebind(query string) string
}

/*
countWorkspacePurgeRows counts every operational row targeted by retention.
*/
func (s *SQLDataRetentionStore) countWorkspacePurgeRows(
	ctx context.Context,
	executor dataRetentionExecutor,
	workspaceID domain.ID,
	cutoffDate string,
) (*DataRetentionCounts, error) {
	counts := DataRetentionCounts{}
	cutoffTimestamp, err := time.Parse("2006-01-02", cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("parse retention cutoff timestamp: %w", err)
	}

	counts.StandupSubmissions, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_standup_submissions
		WHERE workspace_id = ? AND occurrence_date < ?
	`, workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old standup submissions: %w", err)
	}

	counts.StandupAnswers, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_standup_answers
		WHERE workspace_id = ?
		AND submission_id IN (
			SELECT id
			FROM campfire_standup_submissions
			WHERE workspace_id = ? AND occurrence_date < ?
		)
	`, workspaceID.String(), workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old standup answers: %w", err)
	}

	counts.LeaveRequests, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_leave_requests
		WHERE workspace_id = ? AND end_date < ?
	`, workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old leave requests: %w", err)
	}

	counts.LeaveDecisions, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_leave_decisions
		WHERE workspace_id = ?
		AND leave_request_id IN (
			SELECT id
			FROM campfire_leave_requests
			WHERE workspace_id = ? AND end_date < ?
		)
	`, workspaceID.String(), workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old leave decisions: %w", err)
	}

	counts.TimeEntries, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_time_entries
		WHERE workspace_id = ? AND entry_date < ?
	`, workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old time entries: %w", err)
	}

	counts.ReportRuns, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_report_runs
		WHERE workspace_id = ? AND period_end < ?
	`, workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old report runs: %w", err)
	}

	counts.NotificationRuns, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_notification_runs
		WHERE workspace_id = ? AND occurrence_date < ?
	`, workspaceID.String(), cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("count old notification runs: %w", err)
	}

	counts.AuditLogEntries, err = countRows(ctx, executor, `
		SELECT COUNT(*)
		FROM campfire_audit_log
		WHERE workspace_id = ? AND created_at < ?
	`, workspaceID.String(), cutoffTimestamp)
	if err != nil {
		return nil, fmt.Errorf("count old audit log entries: %w", err)
	}

	return &counts, nil
}

/*
deleteWorkspacePurgeRows deletes old operational rows in dependency-safe order.
*/
func (s *SQLDataRetentionStore) deleteWorkspacePurgeRows(
	ctx context.Context,
	executor dataRetentionExecutor,
	workspaceID domain.ID,
	cutoffDate string,
) error {
	operations := []struct {
		name  string
		query string
	}{
		{
			name: "old standup answers",
			query: `
				DELETE FROM campfire_standup_answers
				WHERE workspace_id = ?
				AND submission_id IN (
					SELECT id
					FROM campfire_standup_submissions
					WHERE workspace_id = ? AND occurrence_date < ?
				)
			`,
		},
		{
			name: "old leave decisions",
			query: `
				DELETE FROM campfire_leave_decisions
				WHERE workspace_id = ?
				AND leave_request_id IN (
					SELECT id
					FROM campfire_leave_requests
					WHERE workspace_id = ? AND end_date < ?
				)
			`,
		},
		{
			name: "old time entries",
			query: `
				DELETE FROM campfire_time_entries
				WHERE workspace_id = ? AND entry_date < ?
			`,
		},
		{
			name: "old report runs",
			query: `
				DELETE FROM campfire_report_runs
				WHERE workspace_id = ? AND period_end < ?
			`,
		},
		{
			name: "old notification runs",
			query: `
				DELETE FROM campfire_notification_runs
				WHERE workspace_id = ? AND occurrence_date < ?
			`,
		},
		{
			name: "old leave requests",
			query: `
				DELETE FROM campfire_leave_requests
				WHERE workspace_id = ? AND end_date < ?
			`,
		},
		{
			name: "old standup submissions",
			query: `
				DELETE FROM campfire_standup_submissions
				WHERE workspace_id = ? AND occurrence_date < ?
			`,
		},
		{
			name: "old audit log entries",
			query: `
				DELETE FROM campfire_audit_log
				WHERE workspace_id = ? AND created_at < ?
			`,
		},
	}

	cutoffTimestamp, err := time.Parse("2006-01-02", cutoffDate)
	if err != nil {
		return fmt.Errorf("parse retention cutoff timestamp: %w", err)
	}

	for _, operation := range operations {
		args := []interface{}{workspaceID.String(), cutoffDate}
		if operation.name == "old audit log entries" {
			args = []interface{}{workspaceID.String(), cutoffTimestamp}
		}
		if operation.name == "old standup answers" || operation.name == "old leave decisions" {
			args = []interface{}{workspaceID.String(), workspaceID.String(), cutoffDate}
		}

		if _, err := execRows(ctx, executor, operation.query, args...); err != nil {
			return fmt.Errorf("delete %s: %w", operation.name, err)
		}
	}

	return nil
}

/*
countRows returns a COUNT(*) value for one query.
*/
func countRows(ctx context.Context, executor dataRetentionExecutor, query string, args ...interface{}) (int, error) {
	var count int
	if err := executor.GetContext(ctx, &count, executor.Rebind(query), args...); err != nil {
		return 0, err
	}

	return count, nil
}

/*
execRows executes one mutation and returns affected row count when available.
*/
func execRows(ctx context.Context, executor dataRetentionExecutor, query string, args ...interface{}) (int64, error) {
	result, err := executor.ExecContext(ctx, executor.Rebind(query), args...)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, nil
	}

	return rowsAffected, nil
}
