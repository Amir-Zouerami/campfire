package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
ListWorkspaceOffDaysResponse is returned by GET /workspaces/{workspaceID}/off-days.
*/
type ListWorkspaceOffDaysResponse struct {
	OffDays []WorkspaceOffDayPayload `json:"offDays"`
}

/*
CreateWorkspaceOffDayRequest is accepted by POST /workspaces/{workspaceID}/off-days.
*/
type CreateWorkspaceOffDayRequest struct {
	Date  string `json:"date"`
	Label string `json:"label"`
}

/*
CreateWorkspaceOffDayResponse is returned by POST /workspaces/{workspaceID}/off-days.
*/
type CreateWorkspaceOffDayResponse struct {
	OffDay WorkspaceOffDayPayload `json:"offDay"`
}

/*
DeleteWorkspaceOffDayResponse is returned by DELETE /workspaces/{workspaceID}/off-days/{offDayID}.
*/
type DeleteWorkspaceOffDayResponse struct {
	Deleted bool `json:"deleted"`
}

/*
WorkspaceCalendarOffDaysToPayload maps workspace off-days to API payloads.
*/
func WorkspaceCalendarOffDaysToPayload(offDays []domain.WorkspaceOffDay) []WorkspaceOffDayPayload {
	payloads := make([]WorkspaceOffDayPayload, 0, len(offDays))

	for _, offDay := range offDays {
		payloads = append(payloads, WorkspaceOffDayToPayload(offDay))
	}

	return payloads
}
