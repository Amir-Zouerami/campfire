package api

import "github.com/amir-zouerami/campfire/server/service"

/*
ValidateLeaveRequestRequest is accepted by POST /leaves/validate.
*/
type ValidateLeaveRequestRequest struct {
	WorkspaceID  string `json:"workspaceId"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	DurationMode string `json:"durationMode"`
	HalfDayPart  string `json:"halfDayPart"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
}

/*
ValidateLeaveRequestResponse is returned by POST /leaves/validate.
*/
type ValidateLeaveRequestResponse struct {
	Allowed         bool                    `json:"allowed"`
	Message         string                  `json:"message"`
	GlobalSkipDates []GlobalSkipDatePayload `json:"globalSkipDates"`
}

/*
ToServiceInput maps an API leave validation request to a service input.
*/
func (r ValidateLeaveRequestRequest) ToServiceInput(actorUserID string) service.ValidateLeaveRequestInput {
	return service.ValidateLeaveRequestInput{
		ActorUserID:  actorUserID,
		WorkspaceID:  r.WorkspaceID,
		StartDate:    r.StartDate,
		EndDate:      r.EndDate,
		DurationMode: r.DurationMode,
		HalfDayPart:  r.HalfDayPart,
		StartTime:    r.StartTime,
		EndTime:      r.EndTime,
	}
}

/*
LeaveValidationResultToResponse maps a service result to an API response.
*/
func LeaveValidationResultToResponse(result service.ValidateLeaveRequestResult) ValidateLeaveRequestResponse {
	return ValidateLeaveRequestResponse{
		Allowed:         result.Allowed,
		Message:         result.Message,
		GlobalSkipDates: GlobalSkipDatesToPayload(result.GlobalSkipDates),
	}
}
