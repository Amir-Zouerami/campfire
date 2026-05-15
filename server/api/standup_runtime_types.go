package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
WorkspaceOffDayPayload is the API representation of a workspace off-day.
*/
type WorkspaceOffDayPayload struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	Date        string `json:"date"`
	Label       string `json:"label"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
}

/*
StandupRunDecisionPayload is the API representation of a standup runtime decision.
*/
type StandupRunDecisionPayload struct {
	WorkspaceID string `json:"workspaceId"`
	Date        string `json:"date"`

	ShouldRun bool   `json:"shouldRun"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`

	IsWorkingDay       bool `json:"isWorkingDay"`
	MemberCount        int  `json:"memberCount"`
	OnLeaveMemberCount int  `json:"onLeaveMemberCount"`

	GlobalOffDays    []GlobalSkipDatePayload      `json:"globalOffDays"`
	WorkspaceOffDays []WorkspaceOffDayPayload     `json:"workspaceOffDays"`
	ApprovedLeaves   []PendingLeaveRequestPayload `json:"approvedLeaves"`
}

/*
EvaluateStandupDayResponse is returned by GET /workspaces/{workspaceID}/standup-runtime/day.
*/
type EvaluateStandupDayResponse struct {
	Decision StandupRunDecisionPayload `json:"decision"`
}

/*
WorkspaceOffDayToPayload maps a workspace off-day to its API representation.
*/
func WorkspaceOffDayToPayload(offDay domain.WorkspaceOffDay) WorkspaceOffDayPayload {
	return WorkspaceOffDayPayload{
		ID:          offDay.ID.String(),
		WorkspaceID: offDay.WorkspaceID.String(),
		Date:        offDay.Date.String(),
		Label:       offDay.Label,
		CreatedBy:   offDay.CreatedBy,
		CreatedAt:   formatAPITime(offDay.CreatedAt),
	}
}

/*
WorkspaceOffDaysToPayload maps workspace off-days to API payloads.
*/
func WorkspaceOffDaysToPayload(offDays []domain.WorkspaceOffDay) []WorkspaceOffDayPayload {
	payloads := make([]WorkspaceOffDayPayload, 0, len(offDays))

	for _, offDay := range offDays {
		payloads = append(payloads, WorkspaceOffDayToPayload(offDay))
	}

	return payloads
}

/*
StandupRunDecisionToPayload maps a standup run decision to its API representation.
*/
func StandupRunDecisionToPayload(decision domain.StandupRunDecision) StandupRunDecisionPayload {
	return StandupRunDecisionPayload{
		WorkspaceID: decision.WorkspaceID.String(),
		Date:        decision.Date.String(),

		ShouldRun: decision.ShouldRun,
		Reason:    string(decision.Reason),
		Message:   decision.Message,

		IsWorkingDay:       decision.IsWorkingDay,
		MemberCount:        decision.MemberCount,
		OnLeaveMemberCount: decision.OnLeaveMemberCount,

		GlobalOffDays:    GlobalSkipDatesToPayload(decision.GlobalOffDays),
		WorkspaceOffDays: WorkspaceOffDaysToPayload(decision.WorkspaceOffDays),
		ApprovedLeaves:   PendingLeaveRequestsToPayload(decision.ApprovedLeaves),
	}
}
