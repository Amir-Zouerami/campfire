package api

import (
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
LeaveTypePayload is the API representation of a leave type.
*/
type LeaveTypePayload struct {
	ID               string `json:"id"`
	WorkspaceID      string `json:"workspaceId"`
	Name             string `json:"name"`
	Code             string `json:"code"`
	Color            string `json:"color"`
	RequiresApproval bool   `json:"requiresApproval"`
	IsActive         bool   `json:"isActive"`
}

/*
ListLeaveTypesResponse is returned by GET /workspaces/{workspaceID}/leave-types.
*/
type ListLeaveTypesResponse struct {
	LeaveTypes []LeaveTypePayload `json:"leaveTypes"`
}

/*
CreateLeaveRequest is accepted by POST /leaves.
*/
type CreateLeaveRequest struct {
	WorkspaceID  string `json:"workspaceId"`
	LeaveTypeID  string `json:"leaveTypeId"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	DurationMode string `json:"durationMode"`
	HalfDayPart  string `json:"halfDayPart"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
	Reason       string `json:"reason"`
	BackupUserID string `json:"backupUserId"`
}

/*
DecideLeaveRequest is accepted by POST /leaves/{leaveRequestID}/decision.
*/
type DecideLeaveRequest struct {
	Decision string `json:"decision"`
	Comment  string `json:"comment"`
}

/*
CancelLeaveRequestResponse is returned by POST /leaves/{leaveRequestID}/cancel.
*/
type CancelLeaveRequestResponse struct {
	LeaveRequest LeaveRequestPayload `json:"leaveRequest"`
}

/*
LeaveRequestPayload is the API representation of a leave request.
*/
type LeaveRequestPayload struct {
	ID           string `json:"id"`
	WorkspaceID  string `json:"workspaceId"`
	UserID       string `json:"userId"`
	LeaveTypeID  string `json:"leaveTypeId"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	DurationMode string `json:"durationMode"`
	HalfDayPart  string `json:"halfDayPart"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
	Reason       string `json:"reason"`
	BackupUserID string `json:"backupUserId"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
	CancelledAt  string `json:"cancelledAt"`
}

/*
PendingLeaveRequestPayload is the API representation of a pending approval row.
*/
type PendingLeaveRequestPayload struct {
	LeaveRequest   LeaveRequestPayload `json:"leaveRequest"`
	LeaveTypeName  string              `json:"leaveTypeName"`
	LeaveTypeColor string              `json:"leaveTypeColor"`
}

/*
CreateLeaveResponse is returned by POST /leaves.
*/
type CreateLeaveResponse struct {
	LeaveRequest LeaveRequestPayload `json:"leaveRequest"`
}

/*
ListPendingLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/pending.
*/
type ListPendingLeaveRequestsResponse struct {
	LeaveRequests []PendingLeaveRequestPayload `json:"leaveRequests"`
}

/*
ListMyPendingLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/my-pending.
*/
type ListMyPendingLeaveRequestsResponse struct {
	LeaveRequests []PendingLeaveRequestPayload `json:"leaveRequests"`
}

/*
ListApprovedLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/approved.
*/
type ListApprovedLeaveRequestsResponse struct {
	LeaveRequests []PendingLeaveRequestPayload `json:"leaveRequests"`
}

/*
DecideLeaveResponse is returned by POST /leaves/{leaveRequestID}/decision.
*/
type DecideLeaveResponse struct {
	LeaveRequest LeaveRequestPayload `json:"leaveRequest"`
}

/*
LeaveTypesToPayload maps domain leave types to API payloads.
*/
func LeaveTypesToPayload(leaveTypes []domain.LeaveType) []LeaveTypePayload {
	payloads := make([]LeaveTypePayload, 0, len(leaveTypes))

	for _, leaveType := range leaveTypes {
		payloads = append(payloads, LeaveTypeToPayload(leaveType))
	}

	return payloads
}

/*
LeaveTypeToPayload maps a domain leave type to its API representation.
*/
func LeaveTypeToPayload(leaveType domain.LeaveType) LeaveTypePayload {
	return LeaveTypePayload{
		ID:               leaveType.ID.String(),
		WorkspaceID:      leaveType.WorkspaceID.String(),
		Name:             leaveType.Name,
		Code:             leaveType.Code,
		Color:            leaveType.Color,
		RequiresApproval: leaveType.RequiresApproval,
		IsActive:         leaveType.IsActive,
	}
}

/*
LeaveRequestToPayload maps a domain leave request to its API representation.
*/
func LeaveRequestToPayload(leaveRequest domain.LeaveRequest) LeaveRequestPayload {
	return LeaveRequestPayload{
		ID:           leaveRequest.ID.String(),
		WorkspaceID:  leaveRequest.WorkspaceID.String(),
		UserID:       leaveRequest.UserID,
		LeaveTypeID:  leaveRequest.LeaveTypeID.String(),
		StartDate:    leaveRequest.StartDate.String(),
		EndDate:      leaveRequest.EndDate.String(),
		DurationMode: string(leaveRequest.DurationMode),
		HalfDayPart:  string(leaveRequest.HalfDayPart),
		StartTime:    leaveRequest.StartTime.String(),
		EndTime:      leaveRequest.EndTime.String(),
		Reason:       leaveRequest.Reason,
		BackupUserID: leaveRequest.BackupUserID,
		Status:       string(leaveRequest.Status),
		CreatedAt:    formatAPITime(leaveRequest.CreatedAt),
		UpdatedAt:    formatAPITime(leaveRequest.UpdatedAt),
		CancelledAt:  formatOptionalAPITime(leaveRequest.CancelledAt),
	}
}

/*
PendingLeaveRequestsToPayload maps pending domain rows to API payloads.
*/
func PendingLeaveRequestsToPayload(
	leaveRequests []domain.LeaveRequestWithType,
) []PendingLeaveRequestPayload {
	payloads := make([]PendingLeaveRequestPayload, 0, len(leaveRequests))

	for _, leaveRequest := range leaveRequests {
		payloads = append(payloads, PendingLeaveRequestPayload{
			LeaveRequest:   LeaveRequestToPayload(leaveRequest.LeaveRequest),
			LeaveTypeName:  leaveRequest.LeaveTypeName,
			LeaveTypeColor: leaveRequest.LeaveTypeColor,
		})
	}

	return payloads
}

/*
ToServiceInput maps an API create-leave request to service input.
*/
func (r CreateLeaveRequest) ToServiceInput(actorUserID string) service.CreateLeaveInput {
	return service.CreateLeaveInput{
		ActorUserID:  actorUserID,
		WorkspaceID:  r.WorkspaceID,
		LeaveTypeID:  r.LeaveTypeID,
		StartDate:    r.StartDate,
		EndDate:      r.EndDate,
		DurationMode: r.DurationMode,
		HalfDayPart:  r.HalfDayPart,
		StartTime:    r.StartTime,
		EndTime:      r.EndTime,
		Reason:       r.Reason,
		BackupUserID: r.BackupUserID,
	}
}

/*
ToServiceInput maps an API leave decision request to service input.
*/
func (r DecideLeaveRequest) ToServiceInput(
	actorUserID string,
	isSystemAdmin bool,
	leaveRequestID string,
) service.DecideLeaveInput {
	return service.DecideLeaveInput{
		ActorUserID:    actorUserID,
		IsSystemAdmin:  isSystemAdmin,
		LeaveRequestID: leaveRequestID,
		Decision:       r.Decision,
		Comment:        r.Comment,
	}
}

/*
formatOptionalAPITime formats an optional timestamp for API responses.
*/
func formatOptionalAPITime(value *time.Time) string {
	if value == nil {
		return ""
	}

	return formatAPITime(*value)
}
