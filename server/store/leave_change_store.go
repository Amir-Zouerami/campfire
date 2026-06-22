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
ListPendingChangeRequestsByWorkspaceID returns pending member-requested leave corrections for approvers.
*/
func (s *SQLLeaveStore) ListPendingChangeRequestsByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.LeaveChangeRequestWithType, error) {
	records := []leaveChangeRequestWithTypeRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				changes.id,
				changes.leave_request_id,
				changes.workspace_id,
				changes.requester_user_id,
				changes.leave_type_id,
				changes.start_date,
				changes.end_date,
				changes.duration_mode,
				changes.half_day_part,
				changes.start_time,
				changes.end_time,
				changes.reason,
				changes.backup_user_id,
				changes.can_contact_if_needed,
				changes.status,
				changes.created_by,
				changes.decided_by,
				changes.decision_comment,
				changes.created_at,
				changes.updated_at,
				changes.decided_at,
				types.name AS leave_type_name,
				types.color AS leave_type_color
			FROM campfire_leave_change_requests changes
			INNER JOIN campfire_leave_types types
				ON types.id = changes.leave_type_id
			WHERE changes.workspace_id = ? AND changes.status = ?
			ORDER BY changes.created_at ASC
		`),
		workspaceID.String(),
		string(domain.LeaveChangeRequestStatusPending),
	)
	if err != nil {
		return nil, fmt.Errorf("list pending leave change requests: %w", err)
	}

	changeRequests := make([]domain.LeaveChangeRequestWithType, 0, len(records))
	for _, record := range records {
		changeRequests = append(changeRequests, record.toDomain())
	}

	return changeRequests, nil
}

/*
GetChangeRequestByID returns one leave change request by ID.
*/
func (s *SQLLeaveStore) GetChangeRequestByID(
	ctx context.Context,
	changeRequestID domain.ID,
) (*domain.LeaveChangeRequest, error) {
	var record leaveChangeRequestRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				leave_request_id,
				workspace_id,
				requester_user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				can_contact_if_needed,
				status,
				created_by,
				decided_by,
				decision_comment,
				created_at,
				updated_at,
				decided_at
			FROM campfire_leave_change_requests
			WHERE id = ?
		`),
		changeRequestID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get leave change request by id: %w", err)
	}

	changeRequest := record.toDomain()

	return &changeRequest, nil
}

/*
HasPendingChangeRequestForLeaveRequest returns whether a leave request already has an undecided edit request.
*/
func (s *SQLLeaveStore) HasPendingChangeRequestForLeaveRequest(
	ctx context.Context,
	leaveRequestID domain.ID,
) (bool, error) {
	var count int

	err := s.db.GetContext(
		ctx,
		&count,
		s.db.Rebind(`
			SELECT COUNT(*)
			FROM campfire_leave_change_requests
			WHERE leave_request_id = ? AND status = ?
		`),
		leaveRequestID.String(),
		string(domain.LeaveChangeRequestStatusPending),
	)
	if err != nil {
		return false, fmt.Errorf("check pending leave change request: %w", err)
	}

	return count > 0, nil
}

/*
CreateChangeRequest inserts a member-requested leave correction.
*/
func (s *SQLLeaveStore) CreateChangeRequest(
	ctx context.Context,
	changeRequest domain.LeaveChangeRequest,
) (*domain.LeaveChangeRequest, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_leave_change_requests (
				id,
				leave_request_id,
				workspace_id,
				requester_user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				can_contact_if_needed,
				status,
				created_by,
				decided_by,
				decision_comment,
				created_at,
				updated_at,
				decided_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		changeRequest.ID.String(),
		changeRequest.LeaveRequestID.String(),
		changeRequest.WorkspaceID.String(),
		changeRequest.RequesterUserID,
		changeRequest.LeaveTypeID.String(),
		changeRequest.StartDate.String(),
		changeRequest.EndDate.String(),
		string(changeRequest.DurationMode),
		string(changeRequest.HalfDayPart),
		changeRequest.StartTime.String(),
		changeRequest.EndTime.String(),
		changeRequest.Reason,
		changeRequest.BackupUserID,
		changeRequest.CanContactIfNeeded,
		string(changeRequest.Status),
		changeRequest.CreatedBy,
		changeRequest.DecidedBy,
		changeRequest.DecisionComment,
		changeRequest.CreatedAt,
		changeRequest.UpdatedAt,
		changeRequest.DecidedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert leave change request: %w", err)
	}

	return &changeRequest, nil
}

/*
DecideChangeRequest approves or rejects a leave change request.

When approved, the proposed fields are applied to the original leave request in
the same transaction so approver decisions cannot be partially persisted.
*/
func (s *SQLLeaveStore) DecideChangeRequest(
	ctx context.Context,
	params DecideLeaveChangeRequestParams,
) (*domain.LeaveChangeRequest, *domain.LeaveRequest, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("begin leave change decision transaction: %w", err)
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

	changeRequest, err := reloadLeaveChangeRequest(ctx, transaction, s.db, params.ChangeRequestID)
	if err != nil {
		return nil, nil, err
	}

	if changeRequest.Status != domain.LeaveChangeRequestStatusPending {
		return nil, nil, ErrConflict
	}

	var updatedLeaveRequest *domain.LeaveRequest
	if params.Decision == domain.LeaveChangeRequestStatusApproved {
		result, updateErr := transaction.ExecContext(
			ctx,
			s.db.Rebind(`
				UPDATE campfire_leave_requests
				SET
					leave_type_id = ?,
					start_date = ?,
					end_date = ?,
					duration_mode = ?,
					half_day_part = ?,
					start_time = ?,
					end_time = ?,
					reason = ?,
					backup_user_id = ?,
					can_contact_if_needed = ?,
					updated_at = ?
				WHERE id = ? AND status IN (?, ?)
			`),
			changeRequest.LeaveTypeID.String(),
			changeRequest.StartDate.String(),
			changeRequest.EndDate.String(),
			string(changeRequest.DurationMode),
			string(changeRequest.HalfDayPart),
			changeRequest.StartTime.String(),
			changeRequest.EndTime.String(),
			changeRequest.Reason,
			changeRequest.BackupUserID,
			changeRequest.CanContactIfNeeded,
			params.UpdatedAt,
			changeRequest.LeaveRequestID.String(),
			string(domain.LeaveStatusPending),
			string(domain.LeaveStatusApproved),
		)
		if updateErr != nil {
			return nil, nil, fmt.Errorf("apply leave change request fields: %w", updateErr)
		}

		rowsAffected, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			return nil, nil, fmt.Errorf("read leave change application result: %w", rowsErr)
		}

		if rowsAffected == 0 {
			return nil, nil, ErrConflict
		}

		updatedLeaveRequest, err = reloadLeaveRequest(ctx, transaction, s.db, changeRequest.LeaveRequestID)
		if err != nil {
			return nil, nil, err
		}
	} else {
		updatedLeaveRequest, err = reloadLeaveRequest(ctx, transaction, s.db, changeRequest.LeaveRequestID)
		if err != nil {
			return nil, nil, err
		}
	}

	_, err = transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_leave_change_requests
			SET
				status = ?,
				decided_by = ?,
				decision_comment = ?,
				updated_at = ?,
				decided_at = ?
			WHERE id = ? AND status = ?
		`),
		string(params.Decision),
		params.DecidedBy,
		params.Comment,
		params.UpdatedAt,
		params.DecidedAt,
		params.ChangeRequestID.String(),
		string(domain.LeaveChangeRequestStatusPending),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("update leave change request decision: %w", err)
	}

	decidedChangeRequest, err := reloadLeaveChangeRequest(ctx, transaction, s.db, params.ChangeRequestID)
	if err != nil {
		return nil, nil, err
	}

	if err := transaction.Commit(); err != nil {
		return nil, nil, fmt.Errorf("commit leave change decision transaction: %w", err)
	}

	committed = true

	return decidedChangeRequest, updatedLeaveRequest, nil
}

/*
reloadLeaveChangeRequest reloads a leave change request inside a transaction.
*/
func reloadLeaveChangeRequest(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	changeRequestID domain.ID,
) (*domain.LeaveChangeRequest, error) {
	var record leaveChangeRequestRecord

	err := tx.GetContext(
		ctx,
		&record,
		db.Rebind(`
			SELECT
				id,
				leave_request_id,
				workspace_id,
				requester_user_id,
				leave_type_id,
				start_date,
				end_date,
				duration_mode,
				half_day_part,
				start_time,
				end_time,
				reason,
				backup_user_id,
				can_contact_if_needed,
				status,
				created_by,
				decided_by,
				decision_comment,
				created_at,
				updated_at,
				decided_at
			FROM campfire_leave_change_requests
			WHERE id = ?
		`),
		changeRequestID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("reload leave change request: %w", err)
	}

	changeRequest := record.toDomain()

	return &changeRequest, nil
}

/*
leaveChangeRequestRecord represents a row from campfire_leave_change_requests.
*/
type leaveChangeRequestRecord struct {
	ID                 string       `db:"id"`
	LeaveRequestID     string       `db:"leave_request_id"`
	WorkspaceID        string       `db:"workspace_id"`
	RequesterUserID    string       `db:"requester_user_id"`
	LeaveTypeID        string       `db:"leave_type_id"`
	StartDate          string       `db:"start_date"`
	EndDate            string       `db:"end_date"`
	DurationMode       string       `db:"duration_mode"`
	HalfDayPart        string       `db:"half_day_part"`
	StartTime          string       `db:"start_time"`
	EndTime            string       `db:"end_time"`
	Reason             string       `db:"reason"`
	BackupUserID       string       `db:"backup_user_id"`
	CanContactIfNeeded bool         `db:"can_contact_if_needed"`
	Status             string       `db:"status"`
	CreatedBy          string       `db:"created_by"`
	DecidedBy          string       `db:"decided_by"`
	DecisionComment    string       `db:"decision_comment"`
	CreatedAt          time.Time    `db:"created_at"`
	UpdatedAt          time.Time    `db:"updated_at"`
	DecidedAt          sql.NullTime `db:"decided_at"`
}

/*
toDomain maps a leave change request record to the domain model.
*/
func (r leaveChangeRequestRecord) toDomain() domain.LeaveChangeRequest {
	var decidedAt *time.Time
	if r.DecidedAt.Valid {
		value := r.DecidedAt.Time
		decidedAt = &value
	}

	return domain.LeaveChangeRequest{
		ID:                 domain.ID(r.ID),
		LeaveRequestID:     domain.ID(r.LeaveRequestID),
		WorkspaceID:        domain.ID(r.WorkspaceID),
		RequesterUserID:    r.RequesterUserID,
		LeaveTypeID:        domain.ID(r.LeaveTypeID),
		StartDate:          domain.LocalDate(r.StartDate),
		EndDate:            domain.LocalDate(r.EndDate),
		DurationMode:       domain.LeaveDurationMode(r.DurationMode),
		HalfDayPart:        domain.LeaveHalfDayPart(r.HalfDayPart),
		StartTime:          domain.TimeOfDay(r.StartTime),
		EndTime:            domain.TimeOfDay(r.EndTime),
		Reason:             r.Reason,
		BackupUserID:       r.BackupUserID,
		CanContactIfNeeded: r.CanContactIfNeeded,
		Status:             domain.LeaveChangeRequestStatus(r.Status),
		CreatedBy:          r.CreatedBy,
		DecidedBy:          r.DecidedBy,
		DecisionComment:    r.DecisionComment,
		CreatedAt:          r.CreatedAt,
		UpdatedAt:          r.UpdatedAt,
		DecidedAt:          decidedAt,
	}
}

/*
leaveChangeRequestWithTypeRecord represents a leave change request with proposed type data.
*/
type leaveChangeRequestWithTypeRecord struct {
	leaveChangeRequestRecord
	LeaveTypeName  string `db:"leave_type_name"`
	LeaveTypeColor string `db:"leave_type_color"`
}

/*
toDomain maps a leave change request/type record to the domain model.
*/
func (r leaveChangeRequestWithTypeRecord) toDomain() domain.LeaveChangeRequestWithType {
	return domain.LeaveChangeRequestWithType{
		ChangeRequest:  r.leaveChangeRequestRecord.toDomain(),
		LeaveTypeName:  r.LeaveTypeName,
		LeaveTypeColor: r.LeaveTypeColor,
	}
}
