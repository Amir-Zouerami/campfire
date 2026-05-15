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
WorkspaceCalendarStore defines workspace working-day and off-day persistence operations.
*/
type WorkspaceCalendarStore interface {
	IsWorkingDay(ctx context.Context, workspaceID domain.ID, weekday int) (bool, error)
	ListWorkingDaysByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.WorkspaceWorkingDay, error)
	ReplaceWorkingDays(
		ctx context.Context,
		workspaceID domain.ID,
		workingDays []domain.WorkspaceWorkingDay,
	) ([]domain.WorkspaceWorkingDay, error)
	ListOffDaysByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.WorkspaceOffDay, error)
	ListOffDaysBetween(
		ctx context.Context,
		workspaceID domain.ID,
		startDate domain.LocalDate,
		endDate domain.LocalDate,
	) ([]domain.WorkspaceOffDay, error)
	CreateOffDay(ctx context.Context, offDay domain.WorkspaceOffDay) (*domain.WorkspaceOffDay, error)
	DeleteOffDay(ctx context.Context, workspaceID domain.ID, offDayID domain.ID) error
}

/*
SQLWorkspaceCalendarStore reads workspace calendar configuration from SQL.
*/
type SQLWorkspaceCalendarStore struct {
	db *sqlx.DB
}

/*
NewSQLWorkspaceCalendarStore creates a SQL-backed workspace calendar store.
*/
func NewSQLWorkspaceCalendarStore(database *Database) *SQLWorkspaceCalendarStore {
	return &SQLWorkspaceCalendarStore{
		db: database.DB,
	}
}

/*
IsWorkingDay returns whether a weekday is enabled for a workspace.

If legacy data is missing a row, Campfire falls back to Monday-Friday so older
local development workspaces do not become permanently blocked.
*/
func (s *SQLWorkspaceCalendarStore) IsWorkingDay(
	ctx context.Context,
	workspaceID domain.ID,
	weekday int,
) (bool, error) {
	var enabled bool

	err := s.db.GetContext(
		ctx,
		&enabled,
		s.db.Rebind(`
			SELECT enabled
			FROM campfire_workspace_working_days
			WHERE workspace_id = ? AND weekday = ?
			LIMIT 1
		`),
		workspaceID.String(),
		weekday,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return isDefaultWorkingDay(weekday), nil
		}

		return false, fmt.Errorf("read workspace working day: %w", err)
	}

	return enabled, nil
}

/*
ListWorkingDaysByWorkspaceID returns stored working-day rows for a workspace.
*/
func (s *SQLWorkspaceCalendarStore) ListWorkingDaysByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.WorkspaceWorkingDay, error) {
	records := []workspaceWorkingDayRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				weekday,
				enabled,
				created_at,
				updated_at
			FROM campfire_workspace_working_days
			WHERE workspace_id = ?
			ORDER BY weekday ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list workspace working days: %w", err)
	}

	workingDays := make([]domain.WorkspaceWorkingDay, 0, len(records))
	for _, record := range records {
		workingDays = append(workingDays, record.toDomain())
	}

	return workingDays, nil
}

/*
ReplaceWorkingDays replaces a workspace working-day configuration.

Campfire stores one row per weekday so runtime checks can stay simple.
*/
func (s *SQLWorkspaceCalendarStore) ReplaceWorkingDays(
	ctx context.Context,
	workspaceID domain.ID,
	workingDays []domain.WorkspaceWorkingDay,
) ([]domain.WorkspaceWorkingDay, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin workspace working-day transaction: %w", err)
	}

	committed := false

	defer func() {
		if !committed {
			rollbackErr := transaction.Rollback()
			if rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
				return
			}
		}
	}()

	_, err = transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_workspace_working_days
			WHERE workspace_id = ?
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("delete workspace working days: %w", err)
	}

	for _, workingDay := range workingDays {
		if err := s.insertWorkingDay(ctx, transaction, workingDay); err != nil {
			return nil, err
		}
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit workspace working-day transaction: %w", err)
	}

	committed = true

	return s.ListWorkingDaysByWorkspaceID(ctx, workspaceID)
}

/*
insertWorkingDay inserts one workspace working-day row.
*/
func (s *SQLWorkspaceCalendarStore) insertWorkingDay(
	ctx context.Context,
	transaction *sqlx.Tx,
	workingDay domain.WorkspaceWorkingDay,
) error {
	_, err := transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspace_working_days (
				id,
				workspace_id,
				weekday,
				enabled,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?)
		`),
		workingDay.ID.String(),
		workingDay.WorkspaceID.String(),
		int(workingDay.Weekday),
		workingDay.Enabled,
		workingDay.CreatedAt,
		workingDay.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace working day: %w", err)
	}

	return nil
}

/*
ListOffDaysByWorkspaceID returns all workspace off-days ordered by date.
*/
func (s *SQLWorkspaceCalendarStore) ListOffDaysByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.WorkspaceOffDay, error) {
	records := []workspaceOffDayRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				date,
				label,
				created_by,
				created_at
			FROM campfire_workspace_skip_dates
			WHERE workspace_id = ?
			ORDER BY date ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list workspace off-days by workspace: %w", err)
	}

	offDays := make([]domain.WorkspaceOffDay, 0, len(records))
	for _, record := range records {
		offDays = append(offDays, record.toDomain())
	}

	return offDays, nil
}

/*
ListOffDaysBetween returns workspace off-days overlapping an inclusive date range.
*/
func (s *SQLWorkspaceCalendarStore) ListOffDaysBetween(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) ([]domain.WorkspaceOffDay, error) {
	records := []workspaceOffDayRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				date,
				label,
				created_by,
				created_at
			FROM campfire_workspace_skip_dates
			WHERE workspace_id = ?
				AND date >= ?
				AND date <= ?
			ORDER BY date ASC
		`),
		workspaceID.String(),
		startDate.String(),
		endDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list workspace off-days: %w", err)
	}

	offDays := make([]domain.WorkspaceOffDay, 0, len(records))
	for _, record := range records {
		offDays = append(offDays, record.toDomain())
	}

	return offDays, nil
}

/*
CreateOffDay inserts a workspace off-day.
*/
func (s *SQLWorkspaceCalendarStore) CreateOffDay(
	ctx context.Context,
	offDay domain.WorkspaceOffDay,
) (*domain.WorkspaceOffDay, error) {
	exists, err := s.offDayExistsByDate(ctx, offDay.WorkspaceID, offDay.Date)
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, ErrConflict
	}

	_, err = s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspace_skip_dates (
				id,
				workspace_id,
				date,
				label,
				created_by,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?)
		`),
		offDay.ID.String(),
		offDay.WorkspaceID.String(),
		offDay.Date.String(),
		offDay.Label,
		offDay.CreatedBy,
		offDay.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert workspace off-day: %w", err)
	}

	created, err := s.getOffDayByID(ctx, offDay.WorkspaceID, offDay.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
DeleteOffDay removes a workspace off-day by ID.
*/
func (s *SQLWorkspaceCalendarStore) DeleteOffDay(
	ctx context.Context,
	workspaceID domain.ID,
	offDayID domain.ID,
) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_workspace_skip_dates
			WHERE workspace_id = ? AND id = ?
		`),
		workspaceID.String(),
		offDayID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete workspace off-day: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read workspace off-day delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

/*
offDayExistsByDate returns true when a workspace already has an off-day for the date.
*/
func (s *SQLWorkspaceCalendarStore) offDayExistsByDate(
	ctx context.Context,
	workspaceID domain.ID,
	date domain.LocalDate,
) (bool, error) {
	var count int

	err := s.db.GetContext(
		ctx,
		&count,
		s.db.Rebind(`
			SELECT COUNT(1)
			FROM campfire_workspace_skip_dates
			WHERE workspace_id = ? AND date = ?
		`),
		workspaceID.String(),
		date.String(),
	)
	if err != nil {
		return false, fmt.Errorf("check workspace off-day existence: %w", err)
	}

	return count > 0, nil
}

/*
getOffDayByID returns one workspace off-day by ID.
*/
func (s *SQLWorkspaceCalendarStore) getOffDayByID(
	ctx context.Context,
	workspaceID domain.ID,
	offDayID domain.ID,
) (*domain.WorkspaceOffDay, error) {
	var record workspaceOffDayRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				date,
				label,
				created_by,
				created_at
			FROM campfire_workspace_skip_dates
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		offDayID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get workspace off-day by id: %w", err)
	}

	offDay := record.toDomain()

	return &offDay, nil
}

/*
isDefaultWorkingDay returns Campfire's safe fallback weekday configuration.
*/
func isDefaultWorkingDay(weekday int) bool {
	return weekday >= 1 && weekday <= 5
}

/*
workspaceWorkingDayRecord represents a row from campfire_workspace_working_days.
*/
type workspaceWorkingDayRecord struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	Weekday     int       `db:"weekday"`
	Enabled     bool      `db:"enabled"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

/*
toDomain maps a workspace working-day record to the domain model.
*/
func (r workspaceWorkingDayRecord) toDomain() domain.WorkspaceWorkingDay {
	return domain.WorkspaceWorkingDay{
		ID:          domain.ID(r.ID),
		WorkspaceID: domain.ID(r.WorkspaceID),
		Weekday:     time.Weekday(r.Weekday),
		Enabled:     r.Enabled,
		CreatedAt:   parseStoredTime(r.CreatedAt),
		UpdatedAt:   parseStoredTime(r.UpdatedAt),
	}
}

/*
workspaceOffDayRecord represents a row from campfire_workspace_skip_dates.
*/
type workspaceOffDayRecord struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	Date        string    `db:"date"`
	Label       string    `db:"label"`
	CreatedBy   string    `db:"created_by"`
	CreatedAt   time.Time `db:"created_at"`
}

/*
toDomain maps a workspace off-day record to the domain model.
*/
func (r workspaceOffDayRecord) toDomain() domain.WorkspaceOffDay {
	return domain.WorkspaceOffDay{
		ID:          domain.ID(r.ID),
		WorkspaceID: domain.ID(r.WorkspaceID),
		Date:        domain.LocalDate(r.Date),
		Label:       r.Label,
		CreatedBy:   r.CreatedBy,
		CreatedAt:   parseStoredTime(r.CreatedAt),
	}
}
