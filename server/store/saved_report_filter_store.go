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
SavedReportFilterStore defines saved report filter persistence operations.
*/
type SavedReportFilterStore interface {
	ListByWorkspaceIDAndUserID(
		ctx context.Context,
		workspaceID domain.ID,
		userID string,
		reportType domain.ReportKind,
	) ([]domain.SavedReportFilter, error)
	GetByID(ctx context.Context, workspaceID domain.ID, userID string, filterID domain.ID) (*domain.SavedReportFilter, error)
	Create(ctx context.Context, filter domain.SavedReportFilter) (*domain.SavedReportFilter, error)
	Delete(ctx context.Context, workspaceID domain.ID, userID string, filterID domain.ID) error
}

/*
SQLSavedReportFilterStore persists saved report filters in SQL.
*/
type SQLSavedReportFilterStore struct {
	db *sqlx.DB
}

/*
NewSQLSavedReportFilterStore creates a SQL-backed saved report filter store.
*/
func NewSQLSavedReportFilterStore(database *Database) *SQLSavedReportFilterStore {
	return &SQLSavedReportFilterStore{
		db: database.DB,
	}
}

/*
ListByWorkspaceIDAndUserID returns saved filters owned by one user in one workspace.
*/
func (s *SQLSavedReportFilterStore) ListByWorkspaceIDAndUserID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	reportType domain.ReportKind,
) ([]domain.SavedReportFilter, error) {
	records := []savedReportFilterRecord{}

	query := `
		SELECT
			id,
			workspace_id,
			user_id,
			name,
			scope,
			report_type,
			filter_json,
			created_at,
			updated_at
		FROM campfire_saved_report_filters
		WHERE workspace_id = ?
			AND user_id = ?
	`

	args := []interface{}{
		workspaceID.String(),
		userID,
	}

	if reportType != "" {
		query += " AND report_type = ?"
		args = append(args, string(reportType))
	}

	query += " ORDER BY updated_at DESC, name ASC"

	err := s.db.SelectContext(ctx, &records, s.db.Rebind(query), args...)
	if err != nil {
		return nil, fmt.Errorf("list saved report filters: %w", err)
	}

	filters := make([]domain.SavedReportFilter, 0, len(records))
	for _, record := range records {
		filters = append(filters, record.toDomain())
	}

	return filters, nil
}

/*
GetByID returns one saved filter owned by one user.
*/
func (s *SQLSavedReportFilterStore) GetByID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	filterID domain.ID,
) (*domain.SavedReportFilter, error) {
	var record savedReportFilterRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				user_id,
				name,
				scope,
				report_type,
				filter_json,
				created_at,
				updated_at
			FROM campfire_saved_report_filters
			WHERE workspace_id = ?
				AND user_id = ?
				AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		userID,
		filterID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get saved report filter by id: %w", err)
	}

	filter := record.toDomain()

	return &filter, nil
}

/*
Create inserts a saved report filter.
*/
func (s *SQLSavedReportFilterStore) Create(
	ctx context.Context,
	filter domain.SavedReportFilter,
) (*domain.SavedReportFilter, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_saved_report_filters (
				id,
				workspace_id,
				user_id,
				name,
				scope,
				report_type,
				filter_json,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		filter.ID.String(),
		filter.WorkspaceID.String(),
		filter.UserID,
		filter.Name,
		string(filter.Scope),
		string(filter.ReportType),
		filter.FilterJSON,
		filter.CreatedAt,
		filter.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert saved report filter: %w", err)
	}

	created, err := s.GetByID(ctx, filter.WorkspaceID, filter.UserID, filter.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
Delete removes one saved report filter owned by one user.
*/
func (s *SQLSavedReportFilterStore) Delete(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	filterID domain.ID,
) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_saved_report_filters
			WHERE workspace_id = ?
				AND user_id = ?
				AND id = ?
		`),
		workspaceID.String(),
		userID,
		filterID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete saved report filter: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read saved report filter delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

/*
savedReportFilterRecord is the SQL representation of a saved report filter.
*/
type savedReportFilterRecord struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	UserID      string    `db:"user_id"`
	Name        string    `db:"name"`
	Scope       string    `db:"scope"`
	ReportType  string    `db:"report_type"`
	FilterJSON  string    `db:"filter_json"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

/*
toDomain maps a SQL saved filter record to domain.
*/
func (r savedReportFilterRecord) toDomain() domain.SavedReportFilter {
	return domain.SavedReportFilter{
		ID:          domain.ID(r.ID),
		WorkspaceID: domain.ID(r.WorkspaceID),
		UserID:      r.UserID,
		Name:        r.Name,
		Scope:       domain.SavedReportFilterScope(r.Scope),
		ReportType:  domain.ReportKind(r.ReportType),
		FilterJSON:  r.FilterJSON,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}
