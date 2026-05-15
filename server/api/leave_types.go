package api

import "github.com/amir-zouerami/campfire/server/service"

/*
ValidateLeaveRequest is accepted by POST /leaves/validate.
*/
type ValidateLeaveRequest struct {
	WorkspaceID  string `json:"workspaceId"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	DurationMode string `json:"durationMode"`
	HalfDayPart  string `json:"halfDayPart"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
}

/*
ValidateLeaveResponse is returned by POST /leaves/validate.
*/
type ValidateLeaveResponse struct {
	Valid bool `json:"valid"`
}

/*
ToServiceInput maps an API leave validation request to service input.
*/
func (r ValidateLeaveRequest) ToServiceInput(actorUserID string) service.ValidateLeaveInput {
	return service.ValidateLeaveInput{
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
