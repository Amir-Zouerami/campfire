package domain

import "time"

/*
LeaveType defines a workspace-level leave type.
*/
type LeaveType struct {
	ID          ID
	WorkspaceID ID

	Name  string
	Code  string
	Color string

	RequiresApproval bool
	IsActive         bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
LeaveDurationMode describes how much time a leave request covers.
*/
type LeaveDurationMode string

const (
	/*
		LeaveDurationFullDay covers full working days.
	*/
	LeaveDurationFullDay LeaveDurationMode = "full_day"

	/*
		LeaveDurationHalfDay covers a morning or afternoon.
	*/
	LeaveDurationHalfDay LeaveDurationMode = "half_day"

	/*
		LeaveDurationHourly covers a specific local time range.
	*/
	LeaveDurationHourly LeaveDurationMode = "hourly"
)

/*
LeaveHalfDayPart identifies which half of a day is covered.
*/
type LeaveHalfDayPart string

const (
	/*
		LeaveHalfDayMorning covers the morning half of a working day.
	*/
	LeaveHalfDayMorning LeaveHalfDayPart = "morning"

	/*
		LeaveHalfDayAfternoon covers the afternoon half of a working day.
	*/
	LeaveHalfDayAfternoon LeaveHalfDayPart = "afternoon"
)

/*
LeaveStatus identifies the approval state of a leave request.
*/
type LeaveStatus string

const (
	/*
		LeaveStatusPending means the request is waiting for approval.
	*/
	LeaveStatusPending LeaveStatus = "pending"

	/*
		LeaveStatusApproved means the request has been approved.
	*/
	LeaveStatusApproved LeaveStatus = "approved"

	/*
		LeaveStatusRejected means the request has been rejected.
	*/
	LeaveStatusRejected LeaveStatus = "rejected"

	/*
		LeaveStatusCancelled means the request was cancelled.
	*/
	LeaveStatusCancelled LeaveStatus = "cancelled"
)

/*
IsValid returns true when the leave duration mode is supported by Campfire MVP.
*/
func (m LeaveDurationMode) IsValid() bool {
	switch m {
	case LeaveDurationFullDay, LeaveDurationHalfDay, LeaveDurationHourly:
		return true
	default:
		return false
	}
}

/*
IsValid returns true when the leave status is supported by Campfire MVP.
*/
func (s LeaveStatus) IsValid() bool {
	switch s {
	case LeaveStatusPending, LeaveStatusApproved, LeaveStatusRejected, LeaveStatusCancelled:
		return true
	default:
		return false
	}
}
