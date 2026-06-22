package api

import (
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
LeaveChangeRequestPayload is the API representation of a member-requested leave correction.
*/
type LeaveChangeRequestPayload struct {
	ID                 string `json:"id"`
	LeaveRequestID     string `json:"leaveRequestId"`
	WorkspaceID        string `json:"workspaceId"`
	RequesterUserID    string `json:"requesterUserId"`
	LeaveTypeID        string `json:"leaveTypeId"`
	StartDate          string `json:"startDate"`
	EndDate            string `json:"endDate"`
	DurationMode       string `json:"durationMode"`
	HalfDayPart        string `json:"halfDayPart"`
	StartTime          string `json:"startTime"`
	EndTime            string `json:"endTime"`
	Reason             string `json:"reason"`
	BackupUserID       string `json:"backupUserId"`
	CanContactIfNeeded bool   `json:"canContactIfNeeded"`
	Status             string `json:"status"`
	CreatedBy          string `json:"createdBy"`
	DecidedBy          string `json:"decidedBy"`
	DecisionComment    string `json:"decisionComment"`
	CreatedAt          string `json:"createdAt"`
	UpdatedAt          string `json:"updatedAt"`
	DecidedAt          string `json:"decidedAt"`
}

/*
PendingLeaveChangeRequestPayload is a pending edit request with proposed leave type data.
*/
type PendingLeaveChangeRequestPayload struct {
	ChangeRequest  LeaveChangeRequestPayload `json:"changeRequest"`
	LeaveTypeName  string                    `json:"leaveTypeName"`
	LeaveTypeColor string                    `json:"leaveTypeColor"`
}

/*
CreateLeaveChangeRequest is accepted by POST /leaves/{leaveRequestID}/change-requests.
*/
type CreateLeaveChangeRequest struct {
	LeaveTypeID        string `json:"leaveTypeId"`
	StartDate          string `json:"startDate"`
	EndDate            string `json:"endDate"`
	DurationMode       string `json:"durationMode"`
	HalfDayPart        string `json:"halfDayPart"`
	StartTime          string `json:"startTime"`
	EndTime            string `json:"endTime"`
	Reason             string `json:"reason"`
	BackupUserID       string `json:"backupUserId"`
	CanContactIfNeeded bool   `json:"canContactIfNeeded"`
}

/*
DecideLeaveChangeRequest is accepted by POST /leaves/change-requests/{changeRequestID}/decision.
*/
type DecideLeaveChangeRequest struct {
	Decision string `json:"decision"`
	Comment  string `json:"comment"`
}

/*
ListPendingLeaveChangeRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/change-requests/pending.
*/
type ListPendingLeaveChangeRequestsResponse struct {
	ChangeRequests []PendingLeaveChangeRequestPayload `json:"changeRequests"`
}

/*
CreateLeaveChangeResponse is returned by POST /leaves/{leaveRequestID}/change-requests.
*/
type CreateLeaveChangeResponse struct {
	ChangeRequest LeaveChangeRequestPayload `json:"changeRequest"`
}

/*
DecideLeaveChangeResponse is returned after an approver decides a leave edit request.
*/
type DecideLeaveChangeResponse struct {
	ChangeRequest LeaveChangeRequestPayload `json:"changeRequest"`
	LeaveRequest  LeaveRequestPayload       `json:"leaveRequest"`
}

/*
ToServiceInput maps an API leave-change request to service input.
*/
func (r CreateLeaveChangeRequest) ToServiceInput(actorUserID string, leaveRequestID string) service.RequestLeaveChangeInput {
	return service.RequestLeaveChangeInput{
		ActorUserID:        actorUserID,
		LeaveRequestID:     leaveRequestID,
		LeaveTypeID:        r.LeaveTypeID,
		StartDate:          r.StartDate,
		EndDate:            r.EndDate,
		DurationMode:       r.DurationMode,
		HalfDayPart:        r.HalfDayPart,
		StartTime:          r.StartTime,
		EndTime:            r.EndTime,
		Reason:             r.Reason,
		BackupUserID:       r.BackupUserID,
		CanContactIfNeeded: r.CanContactIfNeeded,
	}
}

/*
ToServiceInput maps an API leave-change decision to service input.
*/
func (r DecideLeaveChangeRequest) ToServiceInput(
	actorUserID string,
	isSystemAdmin bool,
	changeRequestID string,
) service.DecideLeaveChangeInput {
	return service.DecideLeaveChangeInput{
		ActorUserID:     actorUserID,
		IsSystemAdmin:   isSystemAdmin,
		ChangeRequestID: changeRequestID,
		Decision:        r.Decision,
		Comment:         r.Comment,
	}
}

/*
LeaveChangeRequestToPayload maps a leave change request to its API representation.
*/
func LeaveChangeRequestToPayload(changeRequest domain.LeaveChangeRequest) LeaveChangeRequestPayload {
	return LeaveChangeRequestPayload{
		ID:                 changeRequest.ID.String(),
		LeaveRequestID:     changeRequest.LeaveRequestID.String(),
		WorkspaceID:        changeRequest.WorkspaceID.String(),
		RequesterUserID:    changeRequest.RequesterUserID,
		LeaveTypeID:        changeRequest.LeaveTypeID.String(),
		StartDate:          changeRequest.StartDate.String(),
		EndDate:            changeRequest.EndDate.String(),
		DurationMode:       string(changeRequest.DurationMode),
		HalfDayPart:        string(changeRequest.HalfDayPart),
		StartTime:          changeRequest.StartTime.String(),
		EndTime:            changeRequest.EndTime.String(),
		Reason:             changeRequest.Reason,
		BackupUserID:       changeRequest.BackupUserID,
		CanContactIfNeeded: changeRequest.CanContactIfNeeded,
		Status:             string(changeRequest.Status),
		CreatedBy:          changeRequest.CreatedBy,
		DecidedBy:          changeRequest.DecidedBy,
		DecisionComment:    changeRequest.DecisionComment,
		CreatedAt:          formatAPITime(changeRequest.CreatedAt),
		UpdatedAt:          formatAPITime(changeRequest.UpdatedAt),
		DecidedAt:          formatOptionalAPITimeFromValue(changeRequest.DecidedAt),
	}
}

/*
PendingLeaveChangeRequestsToPayload maps pending leave change requests to API payloads.
*/
func PendingLeaveChangeRequestsToPayload(
	changeRequests []domain.LeaveChangeRequestWithType,
) []PendingLeaveChangeRequestPayload {
	payloads := make([]PendingLeaveChangeRequestPayload, 0, len(changeRequests))
	for _, changeRequest := range changeRequests {
		payloads = append(payloads, PendingLeaveChangeRequestPayload{
			ChangeRequest:  LeaveChangeRequestToPayload(changeRequest.ChangeRequest),
			LeaveTypeName:  changeRequest.LeaveTypeName,
			LeaveTypeColor: changeRequest.LeaveTypeColor,
		})
	}

	return payloads
}

/*
formatOptionalAPITimeFromValue formats a nullable domain time pointer.
*/
func formatOptionalAPITimeFromValue(value *time.Time) string {
	if value == nil {
		return ""
	}

	return formatAPITime(*value)
}
