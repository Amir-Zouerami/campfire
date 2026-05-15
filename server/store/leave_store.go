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
DecideLeaveRequestParams contains the records needed to approve or reject leave.
*/
type DecideLeaveRequestParams struct {
	LeaveRequestID domain.ID
	NewStatus      domain.LeaveStatus
	Decision       domain.LeaveDecision
	UpdatedAt      time.Time
}

/*
LeaveStore defines persistence operations for leave types and leave requests.
*/
type LeaveStore interface {
	ListTypesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.LeaveType, error)
	GetActiveTypeByID(ctx context.Context, workspaceID domain.ID, leaveTypeID domain.ID) (*domain.LeaveType, error)
	GetRequestByID(ctx context.Context, leaveRequestID domain.ID) (*domain.LeaveRequest, error)
	CreateRequest(ctx context.Context, leaveRequest domain.LeaveRequest) (*domain.LeaveRequest, error)
	DecideRequest(ctx context.Context, params DecideLeaveRequestParams) (*domain.LeaveRequest, error)
}

/*
SQLLeaveStore persists leave data in SQL.
*/
type SQLLeaveStore struct {
	db *sqlx.DB
}

/*
NewSQLLeaveStore creates a SQL-backed leave store.
*/
func NewSQLLeaveStore(database *Database) *SQLLeaveStore {
	return &SQLLeaveStore{
		db: database.DB,
	}
}

/*
ListTypesByWorkspaceID returns active leave types for a workspace.
*/
func (s *SQLLeaveStore) ListTypesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.LeaveType, error) {
	records := []leaveTypeRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				name,
				code,
				color,
				requires_approval,
				is_active,
				created_by,
				created_at,
				updated_at
			FROM campfire_leave_types
			WHERE workspace_id = ? AND is_active = TRUE
			ORDER BY name ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list leave types: %w", err)
	}

	leaveTypes := make([]domain.LeaveType, 0, len(records))
	for _, record := range records {
		leaveTypes = append(leaveTypes, record.toDomain())
	}

	return leaveTypes, nil
}

/*
GetActiveTypeByID returns an active leave type belonging to a workspace.
*/
func (s *SQLLeaveStore) GetActiveTypeByID(
	ctx context.Context,
	workspaceID domain.ID,
	leaveTypeID domain.ID,
) (*domain.LeaveType, error) {
	var record leaveTypeRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				name,
				code,
				color,
				requires_approval,
				is_active,
				created_by,
				created_at,
				updated_at
			FROM campfire_leave_types
			WHERE id = ? AND workspace_id = ? AND is_active = TRUE
			LIMIT 1
		`),
		leaveTypeID.String(),
		workspaceID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get active leave type: %w", err)
	}

	leaveType := record.toDomain()

	return &leaveType, nil
}

/*
GetRequestByID returns a leave request by ID.
*/
func (s *SQLLeaveStore) GetRequestByID(
	ctx context.Context,
	leaveRequestID domain.ID,
) (*domain.LeaveRequest, error) {
	var record leaveRequestRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				status,
				created_at,
				updated_at,
				cancelled_at
			FROM campfire_leave_requests
			WHERE id = ?
			LIMIT 1
		`),
		leaveRequestID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get leave request by id: %w", err)
	}

	leaveRequest := record.toDomain()

	return &leaveRequest, nil
}

/*
CreateRequest inserts a leave request.
*/
func (s *SQLLeaveStore) CreateRequest(
	ctx context.Context,
	leaveRequest domain.LeaveRequest,
) (*domain.LeaveRequest, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_leave_requests (
				id,
				workspace_id,
				user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				status,
				created_at,
				updated_at,
				cancelled_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		leaveRequest.ID.String(),
		leaveRequest.WorkspaceID.String(),
		leaveRequest.UserID,
		leaveRequest.LeaveTypeID.String(),
		leaveRequest.StartDate.String(),
		leaveRequest.EndDate.String(),
		string(leaveRequest.DurationMode),
		string(leaveRequest.HalfDayPart),
		leaveRequest.StartTime.String(),
		leaveRequest.EndTime.String(),
		leaveRequest.Reason,
		leaveRequest.BackupUserID,
		string(leaveRequest.Status),
		leaveRequest.CreatedAt,
		leaveRequest.UpdatedAt,
		leaveRequest.CancelledAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert leave request: %w", err)
	}

	return &leaveRequest, nil
}

/*
DecideRequest updates a pending leave request and records the approval decision.
*/
func (s *SQLLeaveStore) DecideRequest(
	ctx context.Context,
	params DecideLeaveRequestParams,
) (*domain.LeaveRequest, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin leave decision transaction: %w", err)
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

	result, err := transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_leave_requests
			SET status = ?, updated_at = ?
			WHERE id = ? AND status = ?
		`),
		string(params.NewStatus),
		params.UpdatedAt,
		params.LeaveRequestID.String(),
		string(domain.LeaveStatusPending),
	)
	if err != nil {
		return nil, fmt.Errorf("update leave request decision status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read leave request decision update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrConflict
	}

	if err := insertLeaveDecision(ctx, transaction, params.Decision, s.db); err != nil {
		return nil, err
	}

	var record leaveRequestRecord
	if err := transaction.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				status,
				created_at,
				updated_at,
				cancelled_at
			FROM campfire_leave_requests
			WHERE id = ?
			LIMIT 1
		`),
		params.LeaveRequestID.String(),
	); err != nil {
		return nil, fmt.Errorf("reload decided leave request: %w", err)
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit leave decision transaction: %w", err)
	}

	committed = true
	leaveRequest := record.toDomain()

	return &leaveRequest, nil
}

/*
insertLeaveDecision inserts an approval decision row.
*/
func insertLeaveDecision(
	ctx context.Context,
	tx *sqlx.Tx,
	decision domain.LeaveDecision,
	db *sqlx.DB,
) error {
	_, err := tx.ExecContext(
		ctx,
		db.Rebind(`
			INSERT INTO campfire_leave_decisions (
				id,
				leave_request_id,
				workspace_id,
				decided_by,
				decision,
				comment,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
		`),
		decision.ID.String(),
		decision.LeaveRequestID.String(),
		decision.WorkspaceID.String(),
		decision.DecidedBy,
		string(decision.Decision),
		decision.Comment,
		decision.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert leave decision: %w", err)
	}

	return nil
}

/*
leaveTypeRecord represents a row from campfire_leave_types.
*/
type leaveTypeRecord struct {
	ID               string    `db:"id"`
	WorkspaceID      string    `db:"workspace_id"`
	Name             string    `db:"name"`
	Code             string    `db:"code"`
	Color            string    `db:"color"`
	RequiresApproval bool      `db:"requires_approval"`
	IsActive         bool      `db:"is_active"`
	CreatedBy        string    `db:"created_by"`
	CreatedAt        time.Time `db:"created_at"`
	UpdatedAt        time.Time `db:"updated_at"`
}

/*
toDomain maps a leave type record to the domain model.
*/
func (r leaveTypeRecord) toDomain() domain.LeaveType {
	return domain.LeaveType{
		ID:               domain.ID(r.ID),
		WorkspaceID:      domain.ID(r.WorkspaceID),
		Name:             r.Name,
		Code:             r.Code,
		Color:            r.Color,
		RequiresApproval: r.RequiresApproval,
		IsActive:         r.IsActive,
		CreatedBy:        r.CreatedBy,
		CreatedAt:        parseStoredTime(r.CreatedAt),
		UpdatedAt:        parseStoredTime(r.UpdatedAt),
	}
}

/*
leaveRequestRecord represents a row from campfire_leave_requests.
*/
type leaveRequestRecord struct {
	ID           string       `db:"id"`
	WorkspaceID  string       `db:"workspace_id"`
	UserID       string       `db:"user_id"`
	LeaveTypeID  string       `db:"leave_type_id"`
	StartDate    string       `db:"start_date"`
	EndDate      string       `db:"end_date"`
	DurationMode string       `db:"duration_mode"`
	HalfDayPart  string       `db:"half_day_part"`
	StartTime    string       `db:"start_time"`
	EndTime      string       `db:"end_time"`
	Reason       string       `db:"reason"`
	BackupUserID string       `db:"backup_user_id"`
	Status       string       `db:"status"`
	CreatedAt    time.Time    `db:"created_at"`
	UpdatedAt    time.Time    `db:"updated_at"`
	CancelledAt  sql.NullTime `db:"cancelled_at"`
}

/*
toDomain maps a leave request record to the domain model.
*/
func (r leaveRequestRecord) toDomain() domain.LeaveRequest {
	return domain.LeaveRequest{
		ID:           domain.ID(r.ID),
		WorkspaceID:  domain.ID(r.WorkspaceID),
		UserID:       r.UserID,
		LeaveTypeID:  domain.ID(r.LeaveTypeID),
		StartDate:    domain.LocalDate(r.StartDate),
		EndDate:      domain.LocalDate(r.EndDate),
		DurationMode: domain.LeaveDurationMode(r.DurationMode),
		HalfDayPart:  domain.LeaveHalfDayPart(r.HalfDayPart),
		StartTime:    domain.TimeOfDay(r.StartTime),
		EndTime:      domain.TimeOfDay(r.EndTime),
		Reason:       r.Reason,
		BackupUserID: r.BackupUserID,
		Status:       domain.LeaveStatus(r.Status),
		CreatedAt:    parseStoredTime(r.CreatedAt),
		UpdatedAt:    parseStoredTime(r.UpdatedAt),
		CancelledAt:  nullTimeToPointer(r.CancelledAt),
	}
}

/*
nullTimeToPointer maps a nullable SQL timestamp to a time pointer.
*/
func nullTimeToPointer(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}

	parsed := parseStoredTime(value.Time)

	return &parsed
}
