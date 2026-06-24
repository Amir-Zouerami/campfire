package domain

import "time"

/*
LeaveChangeRequestStatus identifies the lifecycle state of a requested change to
an existing leave request.
*/
type LeaveChangeRequestStatus string

const (
	/*
		LeaveChangeRequestStatusPending means the requester asked for a change and
		an approver has not decided it yet.
	*/
	LeaveChangeRequestStatusPending LeaveChangeRequestStatus = "pending"

	/*
		LeaveChangeRequestStatusApproved means an approver accepted the requested
		change and Campfire applied it to the original leave request.
	*/
	LeaveChangeRequestStatusApproved LeaveChangeRequestStatus = "approved"

	/*
		LeaveChangeRequestStatusRejected means an approver explicitly declined the
		requested leave correction.
	*/
	LeaveChangeRequestStatusRejected LeaveChangeRequestStatus = "rejected"
)

/*
IsValid returns true when the leave change request status is supported.
*/
func (s LeaveChangeRequestStatus) IsValid() bool {
	switch s {
	case LeaveChangeRequestStatusPending,
		LeaveChangeRequestStatusApproved,
		LeaveChangeRequestStatusRejected:
		return true
	default:
		return false
	}
}

/*
LeaveChangeRequestAction identifies what the requester wants an approver to do
with an already-approved leave request.
*/
type LeaveChangeRequestAction string

const (
	/*
		LeaveChangeRequestActionEdit asks an approver to apply replacement leave fields.
	*/
	LeaveChangeRequestActionEdit LeaveChangeRequestAction = "edit"

	/*
		LeaveChangeRequestActionDelete asks an approver to remove an already-started approved leave.
	*/
	LeaveChangeRequestActionDelete LeaveChangeRequestAction = "delete"
)

/*
IsValid returns true when the leave change request action is supported.
*/
func (a LeaveChangeRequestAction) IsValid() bool {
	switch a {
	case LeaveChangeRequestActionEdit, LeaveChangeRequestActionDelete:
		return true
	default:
		return false
	}
}

/*
LeaveChangeRequest captures a member-requested correction to an existing leave
request.

Members do not directly edit approved leave. They also do not directly delete
approved leave after its start instant has passed. Instead, Campfire persists an
edit or delete action and lets a Lead, Approver, or system admin decide it.
*/
type LeaveChangeRequest struct {
	ID              ID
	LeaveRequestID  ID
	WorkspaceID     ID
	RequesterUserID string
	Action          LeaveChangeRequestAction

	LeaveTypeID ID
	StartDate   LocalDate
	EndDate     LocalDate

	DurationMode LeaveDurationMode
	HalfDayPart  LeaveHalfDayPart

	StartTime TimeOfDay
	EndTime   TimeOfDay

	Reason       string
	BackupUserID string

	CanContactIfNeeded bool

	Status LeaveChangeRequestStatus

	CreatedBy       string
	DecidedBy       string
	DecisionComment string

	CreatedAt time.Time
	UpdatedAt time.Time
	DecidedAt *time.Time
}

/*
LeaveChangeRequestWithType contains a pending leave change/delete request plus
display data for the proposed or existing leave type.
*/
type LeaveChangeRequestWithType struct {
	ChangeRequest  LeaveChangeRequest
	LeaveTypeName  string
	LeaveTypeColor string
}
