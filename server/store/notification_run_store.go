package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
NotificationRunDedupKey identifies one scheduler notification attempt.

It mirrors the unique constraint on campfire_notification_runs.
*/
type NotificationRunDedupKey struct {
	WorkspaceID      domain.ID
	ReminderRuleID   domain.ID
	ScheduleID       domain.ID
	NotificationKind domain.NotificationKind
	OccurrenceDate   domain.LocalDate
	SequenceNumber   int
	TargetUserID     string
}

/*
NotificationRunStore defines notification-run persistence operations.
*/
type NotificationRunStore interface {
	GetByDedupKey(ctx context.Context, key NotificationRunDedupKey) (*domain.NotificationRun, error)
	Create(ctx context.Context, run domain.NotificationRun) (*domain.NotificationRun, error)
}

/*
SQLNotificationRunStore persists scheduler notification runs in SQL.
*/
type SQLNotificationRunStore struct {
	db *sqlx.DB
}

/*
NewSQLNotificationRunStore creates a SQL-backed notification-run store.
*/
func NewSQLNotificationRunStore(database *Database) *SQLNotificationRunStore {
	return &SQLNotificationRunStore{
		db: database.DB,
	}
}

/*
GetByDedupKey returns an existing notification run by its idempotency key.
*/
func (s *SQLNotificationRunStore) GetByDedupKey(
	ctx context.Context,
	key NotificationRunDedupKey,
) (*domain.NotificationRun, error) {
	var record notificationRunRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				reminder_rule_id,
				schedule_id,
				notification_kind,
				occurrence_date,
				sequence_number,
				target_user_id,
				mattermost_post_id,
				sent_at,
				created_at
			FROM campfire_notification_runs
			WHERE workspace_id = ?
				AND reminder_rule_id = ?
				AND schedule_id = ?
				AND occurrence_date = ?
				AND sequence_number = ?
				AND target_user_id = ?
				AND notification_kind = ?
			LIMIT 1
		`),
		key.WorkspaceID.String(),
		key.ReminderRuleID.String(),
		key.ScheduleID.String(),
		key.OccurrenceDate.String(),
		key.SequenceNumber,
		key.TargetUserID,
		string(key.NotificationKind),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get notification run by dedup key: %w", err)
	}

	run := record.toDomain()

	return &run, nil
}

/*
Create inserts a notification run.
*/
func (s *SQLNotificationRunStore) Create(
	ctx context.Context,
	run domain.NotificationRun,
) (*domain.NotificationRun, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_notification_runs (
				id,
				workspace_id,
				reminder_rule_id,
				schedule_id,
				notification_kind,
				occurrence_date,
				sequence_number,
				target_user_id,
				mattermost_post_id,
				sent_at,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		run.ID.String(),
		run.WorkspaceID.String(),
		run.ReminderRuleID.String(),
		run.ScheduleID.String(),
		string(run.NotificationKind),
		run.OccurrenceDate.String(),
		run.SequenceNumber,
		run.TargetUserID,
		run.MattermostPostID,
		run.SentAt,
		run.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert notification run: %w", err)
	}

	created, err := s.GetByDedupKey(ctx, NotificationRunDedupKey{
		WorkspaceID:      run.WorkspaceID,
		ReminderRuleID:   run.ReminderRuleID,
		ScheduleID:       run.ScheduleID,
		NotificationKind: run.NotificationKind,
		OccurrenceDate:   run.OccurrenceDate,
		SequenceNumber:   run.SequenceNumber,
		TargetUserID:     run.TargetUserID,
	})
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
notificationRunRecord represents one row from campfire_notification_runs.
*/
type notificationRunRecord struct {
	ID               string    `db:"id"`
	WorkspaceID      string    `db:"workspace_id"`
	ReminderRuleID   string    `db:"reminder_rule_id"`
	ScheduleID       string    `db:"schedule_id"`
	NotificationKind string    `db:"notification_kind"`
	OccurrenceDate   string    `db:"occurrence_date"`
	SequenceNumber   int       `db:"sequence_number"`
	TargetUserID     string    `db:"target_user_id"`
	MattermostPostID string    `db:"mattermost_post_id"`
	SentAt           time.Time `db:"sent_at"`
	CreatedAt        time.Time `db:"created_at"`
}

/*
toDomain maps a notification-run record to the domain model.
*/
func (r notificationRunRecord) toDomain() domain.NotificationRun {
	return domain.NotificationRun{
		ID:               domain.ID(r.ID),
		WorkspaceID:      domain.ID(r.WorkspaceID),
		ReminderRuleID:   domain.ID(r.ReminderRuleID),
		ScheduleID:       domain.ID(r.ScheduleID),
		NotificationKind: domain.NotificationKind(r.NotificationKind),
		OccurrenceDate:   domain.LocalDate(r.OccurrenceDate),
		SequenceNumber:   r.SequenceNumber,
		TargetUserID:     r.TargetUserID,
		MattermostPostID: r.MattermostPostID,
		SentAt:           parseStoredTime(r.SentAt),
		CreatedAt:        parseStoredTime(r.CreatedAt),
	}
}
