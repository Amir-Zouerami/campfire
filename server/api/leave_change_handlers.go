package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
handleListPendingLeaveChangeRequests handles listing member-requested leave edits for approvers.
*/
func handleListPendingLeaveChangeRequests(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireApproveLeaves(w, r, log, permissionService, user, workspaceID) {
			return
		}

		changeRequests, err := leaveService.ListPendingChanges(r.Context(), service.ListPendingLeaveChangesInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListPendingLeaveChangeRequests(w, http.StatusOK, ListPendingLeaveChangeRequestsResponse{
			ChangeRequests: PendingLeaveChangeRequestsToPayload(changeRequests),
		})
	}
}

/*
handleCreateLeaveChange handles requester-created leave edit requests.
*/
func handleCreateLeaveChange(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		leaveRequestID := strings.TrimSpace(chi.URLParam(r, "leaveRequestID"))

		var request CreateLeaveChangeRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		changeRequest, err := leaveService.RequestChange(
			r.Context(),
			request.ToServiceInput(user.ID, leaveRequestID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			changeRequest.WorkspaceID.String(),
			user.ID,
			"leave_change_requested",
			"leave_change_request",
			changeRequest.ID.String(),
			map[string]string{
				"leave_request_id": changeRequest.LeaveRequestID.String(),
				"start_date":       string(changeRequest.StartDate),
				"end_date":         string(changeRequest.EndDate),
				"duration":         string(changeRequest.DurationMode),
				"status":           string(changeRequest.Status),
			},
		)

		WriteCreateLeaveChange(w, http.StatusCreated, CreateLeaveChangeResponse{
			ChangeRequest: LeaveChangeRequestToPayload(*changeRequest),
		})
	}
}

/*
handleDecideLeaveChange handles approver decisions for requested leave edits.
*/
func handleDecideLeaveChange(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		changeRequestID := strings.TrimSpace(chi.URLParam(r, "changeRequestID"))

		var request DecideLeaveChangeRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		changeRequest, leaveRequest, err := leaveService.DecideChange(
			r.Context(),
			request.ToServiceInput(user.ID, user.IsSystemAdmin, changeRequestID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			changeRequest.WorkspaceID.String(),
			user.ID,
			"leave_change_decided",
			"leave_change_request",
			changeRequest.ID.String(),
			map[string]string{
				"leave_request_id": leaveRequest.ID.String(),
				"decision":         request.Decision,
				"status":           string(changeRequest.Status),
			},
		)

		WriteDecideLeaveChange(w, http.StatusOK, DecideLeaveChangeResponse{
			ChangeRequest: LeaveChangeRequestToPayload(*changeRequest),
			LeaveRequest:  LeaveRequestToPayload(*leaveRequest),
		})
	}
}
