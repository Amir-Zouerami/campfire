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
handleListLeaveTypes handles listing active leave types for a workspace.
*/
func handleListLeaveTypes(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		leaveTypes, err := leaveService.ListTypes(r.Context(), user.ID, workspaceID)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListLeaveTypes(w, http.StatusOK, ListLeaveTypesResponse{
			LeaveTypes: LeaveTypesToPayload(leaveTypes),
		})
	}
}

/*
handleListPendingLeaveRequests handles listing pending leave requests for approvers.
*/
func handleListPendingLeaveRequests(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		leaveRequests, err := leaveService.ListPending(r.Context(), service.ListPendingLeavesInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListPendingLeaveRequests(w, http.StatusOK, ListPendingLeaveRequestsResponse{
			LeaveRequests: PendingLeaveRequestsToPayload(leaveRequests),
		})
	}
}

/*
handleListMyPendingLeaveRequests handles listing the current user's pending leave requests.
*/
func handleListMyPendingLeaveRequests(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		leaveRequests, err := leaveService.ListMyPending(r.Context(), service.ListMyPendingLeavesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListMyPendingLeaveRequests(w, http.StatusOK, ListMyPendingLeaveRequestsResponse{
			LeaveRequests: PendingLeaveRequestsToPayload(leaveRequests),
		})
	}
}

/*
handleListMyActiveLeaveRequests handles listing the current user's pending and approved leave requests.
*/
func handleListMyActiveLeaveRequests(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		leaveRequests, err := leaveService.ListMyActive(r.Context(), service.ListMyActiveLeavesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListMyActiveLeaveRequests(w, http.StatusOK, ListMyActiveLeaveRequestsResponse{
			LeaveRequests: PendingLeaveRequestsToPayload(leaveRequests),
		})
	}
}

/*
handleListApprovedLeaveRequests handles listing approved leave requests for a date range.
*/
func handleListApprovedLeaveRequests(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		leaveRequests, err := leaveService.ListApproved(r.Context(), service.ListApprovedLeavesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			StartDate:   r.URL.Query().Get("startDate"),
			EndDate:     r.URL.Query().Get("endDate"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListApprovedLeaveRequests(w, http.StatusOK, ListApprovedLeaveRequestsResponse{
			LeaveRequests: PendingLeaveRequestsToPayload(leaveRequests),
		})
	}
}

/*
handleCreateLeave handles creating a pending leave request.
*/
func handleCreateLeave(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request CreateLeaveRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		leaveRequest, err := leaveService.Create(r.Context(), request.ToServiceInput(user.ID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateLeave(w, http.StatusCreated, CreateLeaveResponse{
			LeaveRequest: LeaveRequestToPayload(*leaveRequest),
		})
	}
}

/*
handleDecideLeave handles approving or rejecting a pending leave request.
*/
func handleDecideLeave(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		leaveRequestID := strings.TrimSpace(chi.URLParam(r, "leaveRequestID"))

		var request DecideLeaveRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		leaveRequest, err := leaveService.Decide(
			r.Context(),
			request.ToServiceInput(user.ID, user.IsSystemAdmin, leaveRequestID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteDecideLeave(w, http.StatusOK, DecideLeaveResponse{
			LeaveRequest: LeaveRequestToPayload(*leaveRequest),
		})
	}
}

/*
handleCancelLeave handles requester cancellation for a pending or approved leave request.
*/
func handleCancelLeave(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		leaveRequestID := strings.TrimSpace(chi.URLParam(r, "leaveRequestID"))

		leaveRequest, err := leaveService.Cancel(r.Context(), service.CancelLeaveInput{
			ActorUserID:    user.ID,
			LeaveRequestID: leaveRequestID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCancelLeave(w, http.StatusOK, CancelLeaveRequestResponse{
			LeaveRequest: LeaveRequestToPayload(*leaveRequest),
		})
	}
}
