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
handleListWorkspaceWorkingDays handles listing workspace working-day settings.
*/
func handleListWorkspaceWorkingDays(
	log logger.Logger,
	mm mattermost.Client,
	workspaceCalendarService *service.WorkspaceCalendarService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		workingDays, err := workspaceCalendarService.ListWorkingDays(r.Context(), service.ListWorkspaceWorkingDaysInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListWorkspaceWorkingDays(w, http.StatusOK, ListWorkspaceWorkingDaysResponse{
			WorkingDays: WorkspaceWorkingDaysToPayload(workingDays),
		})
	}
}

/*
handleUpdateWorkspaceWorkingDays handles replacing workspace working-day settings.
*/
func handleUpdateWorkspaceWorkingDays(
	log logger.Logger,
	mm mattermost.Client,
	workspaceCalendarService *service.WorkspaceCalendarService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		var request UpdateWorkspaceWorkingDaysRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		workingDays, err := workspaceCalendarService.UpdateWorkingDays(
			r.Context(),
			service.UpdateWorkspaceWorkingDaysInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				WorkspaceID:   workspaceID,
				WorkingDays:   request.WorkingDays,
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateWorkspaceWorkingDays(w, http.StatusOK, UpdateWorkspaceWorkingDaysResponse{
			WorkingDays: WorkspaceWorkingDaysToPayload(workingDays),
		})
	}
}

/*
handleListWorkspaceOffDays handles listing workspace-specific holidays and no-standup days.
*/
func handleListWorkspaceOffDays(
	log logger.Logger,
	mm mattermost.Client,
	workspaceCalendarService *service.WorkspaceCalendarService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		offDays, err := workspaceCalendarService.ListOffDays(r.Context(), service.ListWorkspaceOffDaysInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListWorkspaceOffDays(w, http.StatusOK, ListWorkspaceOffDaysResponse{
			OffDays: WorkspaceCalendarOffDaysToPayload(offDays),
		})
	}
}

/*
handleCreateWorkspaceOffDay handles creating a workspace-specific holiday or no-standup day.
*/
func handleCreateWorkspaceOffDay(
	log logger.Logger,
	mm mattermost.Client,
	workspaceCalendarService *service.WorkspaceCalendarService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		var request CreateWorkspaceOffDayRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		offDay, err := workspaceCalendarService.CreateOffDay(r.Context(), service.CreateWorkspaceOffDayInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			Date:          request.Date,
			Label:         request.Label,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateWorkspaceOffDay(w, http.StatusCreated, CreateWorkspaceOffDayResponse{
			OffDay: WorkspaceOffDayToPayload(*offDay),
		})
	}
}

/*
handleDeleteWorkspaceOffDay handles deleting a workspace-specific holiday or no-standup day.
*/
func handleDeleteWorkspaceOffDay(
	log logger.Logger,
	mm mattermost.Client,
	workspaceCalendarService *service.WorkspaceCalendarService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		offDayID := strings.TrimSpace(chi.URLParam(r, "offDayID"))

		err := workspaceCalendarService.DeleteOffDay(r.Context(), service.DeleteWorkspaceOffDayInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			OffDayID:      offDayID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteDeleteWorkspaceOffDay(w, http.StatusOK, DeleteWorkspaceOffDayResponse{
			Deleted: true,
		})
	}
}
