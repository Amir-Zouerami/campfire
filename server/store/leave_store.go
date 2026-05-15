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
LeaveStore defines persistence operations for leave types and leave requests.
*/
type LeaveStore interface {
	ListTypesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.LeaveType, error)
	GetActiveTypeByID(ctx context.Context, workspaceID domain.ID, leaveTypeID domain.ID) (*domain.LeaveType, error)
	CreateRequest(ctx context.Context, leaveRequest domain.LeaveRequest) (*domain.LeaveRequest, error)
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
