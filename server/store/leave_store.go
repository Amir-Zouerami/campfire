package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
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
CancelLeaveRequestParams contains the data needed to cancel a cancellable leave request.
*/
type CancelLeaveRequestParams struct {
	LeaveRequestID domain.ID
	CancelledAt    time.Time
	UpdatedAt      time.Time
}

/*
LeaveStore defines persistence operations for leave types and leave requests.
*/
type LeaveStore interface {
	ListTypesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.LeaveType, error)
	GetActiveTypeByID(ctx context.Context, workspaceID domain.ID, leaveTypeID domain.ID) (*domain.LeaveType, error)
	GetRequestByID(ctx context.Context, leaveRequestID domain.ID) (*domain.LeaveRequest, error)
	ListPendingByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.LeaveRequestWithType, error)
	ListPendingByWorkspaceIDAndUserID(
		ctx context.Context,
		workspaceID domain.ID,
		userID string,
	) ([]domain.LeaveRequestWithType, error)
	ListActiveByWorkspaceIDAndUserID(
		ctx context.Context,
		workspaceID domain.ID,
		userID string,
	) ([]domain.LeaveRequestWithType, error)
	ListApprovedByWorkspaceIDBetween(
		ctx context.Context,
		workspaceID domain.ID,
		startDate domain.LocalDate,
		endDate domain.LocalDate,
	) ([]domain.LeaveRequestWithType, error)
	CreateRequest(ctx context.Context, leaveRequest domain.LeaveRequest) (*domain.LeaveRequest, error)
	DecideRequest(ctx context.Context, params DecideLeaveRequestParams) (*domain.LeaveRequest, error)
	CancelRequest(ctx context.Context, params CancelLeaveRequestParams) (*domain.LeaveRequest, error)
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
ListPendingByWorkspaceID returns pending leave requests for approval UI.
*/
func (s *SQLLeaveStore) ListPendingByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.LeaveRequestWithType, error) {
	return s.listPending(ctx, workspaceID, "")
}

/*
ListPendingByWorkspaceIDAndUserID returns a user's pending leave requests.
*/
func (s *SQLLeaveStore) ListPendingByWorkspaceIDAndUserID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
) ([]domain.LeaveRequestWithType, error) {
	return s.listPending(ctx, workspaceID, userID)
}

/*
ListActiveByWorkspaceIDAndUserID returns a user's pending and approved leave requests.
*/
func (s *SQLLeaveStore) ListActiveByWorkspaceIDAndUserID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
) ([]domain.LeaveRequestWithType, error) {
	records := []leaveRequestWithTypeRecord{}
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return []domain.LeaveRequestWithType{}, nil
	}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				requests.id,
				requests.workspace_id,
				requests.user_id,
				requests.leave_type_id,
				requests.start_date,
				requests.end_date,
				requests.duration_mode,
				requests.half_day_part,
				requests.start_time,
				requests.end_time,
				requests.reason,
				requests.backup_user_id,
				requests.status,
				requests.created_at,
				requests.updated_at,
				requests.cancelled_at,
				types.name AS leave_type_name,
				types.color AS leave_type_color
			FROM campfire_leave_requests requests
			INNER JOIN campfire_leave_types types
				ON types.id = requests.leave_type_id
			WHERE requests.workspace_id = ?
				AND requests.user_id = ?
				AND requests.status IN (?, ?)
			ORDER BY requests.start_date ASC, requests.created_at ASC
		`),
		workspaceID.String(),
		cleanUserID,
		string(domain.LeaveStatusPending),
		string(domain.LeaveStatusApproved),
	)
	if err != nil {
		return nil, fmt.Errorf("list active leave requests by user: %w", err)
	}

	results := make([]domain.LeaveRequestWithType, 0, len(records))
	for _, record := range records {
		results = append(results, record.toDomain())
	}

	return results, nil
}

/*
ListApprovedByWorkspaceIDBetween returns approved leave requests overlapping an inclusive date range.
*/
func (s *SQLLeaveStore) ListApprovedByWorkspaceIDBetween(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) ([]domain.LeaveRequestWithType, error) {
	records := []leaveRequestWithTypeRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				requests.id,
				requests.workspace_id,
				requests.user_id,
				requests.leave_type_id,
				requests.start_date,
				requests.end_date,
				requests.duration_mode,
				requests.half_day_part,
				requests.start_time,
				requests.end_time,
				requests.reason,
				requests.backup_user_id,
				requests.status,
				requests.created_at,
				requests.updated_at,
				requests.cancelled_at,
				types.name AS leave_type_name,
				types.color AS leave_type_color
			FROM campfire_leave_requests requests
			INNER JOIN campfire_leave_types types
				ON types.id = requests.leave_type_id
			WHERE requests.workspace_id = ?
				AND requests.status = ?
				AND requests.start_date <= ?
				AND requests.end_date >= ?
			ORDER BY requests.start_date ASC, requests.created_at ASC
		`),
		workspaceID.String(),
		string(domain.LeaveStatusApproved),
		endDate.String(),
		startDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list approved leave requests: %w", err)
	}

	results := make([]domain.LeaveRequestWithType, 0, len(records))
	for _, record := range records {
		results = append(results, record.toDomain())
	}

	return results, nil
}

/*
listPending returns pending leave requests with optional user filtering.
*/
func (s *SQLLeaveStore) listPending(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
) ([]domain.LeaveRequestWithType, error) {
	records := []leaveRequestWithTypeRecord{}
	cleanUserID := userID

	query := `
		SELECT
			requests.id,
			requests.workspace_id,
			requests.user_id,
			requests.leave_type_id,
			requests.start_date,
			requests.end_date,
			requests.duration_mode,
			requests.half_day_part,
			requests.start_time,
			requests.end_time,
			requests.reason,
			requests.backup_user_id,
			requests.status,
			requests.created_at,
			requests.updated_at,
			requests.cancelled_at,
			types.name AS leave_type_name,
			types.color AS leave_type_color
		FROM campfire_leave_requests requests
		INNER JOIN campfire_leave_types types
			ON types.id = requests.leave_type_id
		WHERE requests.workspace_id = ?
			AND requests.status = ?
	`

	args := []interface{}{
		workspaceID.String(),
		string(domain.LeaveStatusPending),
	}

	if cleanUserID != "" {
		query += " AND requests.user_id = ?"
		args = append(args, cleanUserID)
	}

	query += " ORDER BY requests.created_at ASC"

	err := s.db.SelectContext(ctx, &records, s.db.Rebind(query), args...)
	if err != nil {
		return nil, fmt.Errorf("list pending leave requests: %w", err)
	}

	results := make([]domain.LeaveRequestWithType, 0, len(records))
	for _, record := range records {
		results = append(results, record.toDomain())
	}

	return results, nil
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

	leaveRequest, err := reloadLeaveRequest(ctx, transaction, s.db, params.LeaveRequestID)
	if err != nil {
		return nil, err
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit leave decision transaction: %w", err)
	}

	committed = true

	return leaveRequest, nil
}

/*
CancelRequest cancels a pending or approved leave request.
*/
func (s *SQLLeaveStore) CancelRequest(
	ctx context.Context,
	params CancelLeaveRequestParams,
) (*domain.LeaveRequest, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin leave cancellation transaction: %w", err)
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
			SET status = ?, updated_at = ?, cancelled_at = ?
			WHERE id = ? AND status IN (?, ?)
		`),
		string(domain.LeaveStatusCancelled),
		params.UpdatedAt,
		params.CancelledAt,
		params.LeaveRequestID.String(),
		string(domain.LeaveStatusPending),
		string(domain.LeaveStatusApproved),
	)
	if err != nil {
		return nil, fmt.Errorf("update leave request cancellation status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read leave request cancellation update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrConflict
	}

	leaveRequest, err := reloadLeaveRequest(ctx, transaction, s.db, params.LeaveRequestID)
	if err != nil {
		return nil, err
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit leave cancellation transaction: %w", err)
	}

	committed = true

	return leaveRequest, nil
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
reloadLeaveRequest reloads a leave request inside a transaction.
*/
func reloadLeaveRequest(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	leaveRequestID domain.ID,
) (*domain.LeaveRequest, error) {
	var record leaveRequestRecord

	if err := tx.GetContext(
		ctx,
		&record,
		db.Rebind(`
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
	); err != nil {
		return nil, fmt.Errorf("reload leave request: %w", err)
	}

	leaveRequest := record.toDomain()

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
leaveRequestWithTypeRecord represents a pending leave request plus leave type data.
*/
type leaveRequestWithTypeRecord struct {
	leaveRequestRecord

	LeaveTypeName  string `db:"leave_type_name"`
	LeaveTypeColor string `db:"leave_type_color"`
}

/*
toDomain maps a leave request/type record to the domain model.
*/
func (r leaveRequestWithTypeRecord) toDomain() domain.LeaveRequestWithType {
	return domain.LeaveRequestWithType{
		LeaveRequest:   r.leaveRequestRecord.toDomain(),
		LeaveTypeName:  r.LeaveTypeName,
		LeaveTypeColor: r.LeaveTypeColor,
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
