package domain

import "time"

/*
WorkspaceOffDay describes a workspace-specific holiday or no-standup date.
*/
type WorkspaceOffDay struct {
	ID          ID
	WorkspaceID ID

	Date  LocalDate
	Label string

	CreatedBy string
	CreatedAt time.Time
}

/*
StandupSkipReason identifies why a standup should not run.
*/
type StandupSkipReason string

const (
	/*
		StandupSkipReasonNone means the standup should run.
	*/
	StandupSkipReasonNone StandupSkipReason = ""

	/*
		StandupSkipReasonNonWorkingDay means the date is not a workspace working day.
	*/
	StandupSkipReasonNonWorkingDay StandupSkipReason = "non_working_day"

	/*
		StandupSkipReasonGlobalOffDay means the date is a global Campfire off-day.
	*/
	StandupSkipReasonGlobalOffDay StandupSkipReason = "global_off_day"

	/*
		StandupSkipReasonWorkspaceOffDay means the date is a workspace-specific off-day.
	*/
	StandupSkipReasonWorkspaceOffDay StandupSkipReason = "workspace_off_day"

	/*
		StandupSkipReasonEveryoneOnLeave means all known workspace channel members are on approved leave.
	*/
	StandupSkipReasonEveryoneOnLeave StandupSkipReason = "everyone_on_leave"
)

/*
StandupRunDecision describes whether standup automation should run for a date.
*/
type StandupRunDecision struct {
	WorkspaceID ID
	Date        LocalDate

	ShouldRun bool
	Reason    StandupSkipReason
	Message   string

	IsWorkingDay       bool
	MemberCount        int
	OnLeaveMemberCount int

	GlobalOffDays    []GlobalSkipDate
	WorkspaceOffDays []WorkspaceOffDay
	ApprovedLeaves   []LeaveRequestWithType
}
