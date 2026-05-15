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
