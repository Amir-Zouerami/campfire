package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
WorkspaceWorkingDayPayload is the API representation of one workspace weekday setting.
*/
type WorkspaceWorkingDayPayload struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	Weekday     int    `json:"weekday"`
	Enabled     bool   `json:"enabled"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

/*
ListWorkspaceWorkingDaysResponse is returned by GET /workspaces/{workspaceID}/working-days.
*/
type ListWorkspaceWorkingDaysResponse struct {
	WorkingDays []WorkspaceWorkingDayPayload `json:"workingDays"`
}

/*
UpdateWorkspaceWorkingDaysRequest is accepted by PUT /workspaces/{workspaceID}/working-days.
*/
type UpdateWorkspaceWorkingDaysRequest struct {
	WorkingDays []int `json:"workingDays"`
}

/*
UpdateWorkspaceWorkingDaysResponse is returned by PUT /workspaces/{workspaceID}/working-days.
*/
type UpdateWorkspaceWorkingDaysResponse struct {
	WorkingDays []WorkspaceWorkingDayPayload `json:"workingDays"`
}

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
WorkspaceWorkingDaysToPayload maps domain working days to API payloads.
*/
func WorkspaceWorkingDaysToPayload(workingDays []domain.WorkspaceWorkingDay) []WorkspaceWorkingDayPayload {
	payloads := make([]WorkspaceWorkingDayPayload, 0, len(workingDays))

	for _, workingDay := range workingDays {
		payloads = append(payloads, WorkspaceWorkingDayToPayload(workingDay))
	}

	return payloads
}

/*
WorkspaceWorkingDayToPayload maps one domain working day to an API payload.
*/
func WorkspaceWorkingDayToPayload(workingDay domain.WorkspaceWorkingDay) WorkspaceWorkingDayPayload {
	return WorkspaceWorkingDayPayload{
		ID:          workingDay.ID.String(),
		WorkspaceID: workingDay.WorkspaceID.String(),
		Weekday:     int(workingDay.Weekday),
		Enabled:     workingDay.Enabled,
		CreatedAt:   formatAPITime(workingDay.CreatedAt),
		UpdatedAt:   formatAPITime(workingDay.UpdatedAt),
	}
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
