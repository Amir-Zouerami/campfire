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
handleGetWorkspaceByChannel handles current-channel workspace lookup.
*/
func handleGetWorkspaceByChannel(
	log logger.Logger,
	mm mattermost.Client,
	workspaceService *service.WorkspaceService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		channelID := strings.TrimSpace(chi.URLParam(r, "channelID"))

		result, err := workspaceService.GetByChannel(r.Context(), user.ID, channelID)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		canManageWorkspace := user.IsSystemAdmin || userIsChannelAdmin(log, mm, channelID, user.ID)
		result.Capabilities = capabilitiesForUser(user.IsSystemAdmin, canManageWorkspace)

		WriteWorkspaceByChannel(w, http.StatusOK, WorkspaceResultToResponse(*result))
	}
}

/*
handleCreateWorkspace handles workspace creation requests.
*/
func handleCreateWorkspace(
	log logger.Logger,
	mm mattermost.Client,
	workspaceService *service.WorkspaceService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request CreateWorkspaceRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		if !canCreateWorkspace(log, mm, user, request.ChannelID) {
			WriteError(
				w,
				http.StatusForbidden,
				"permission_denied",
				"Only Mattermost system admins or channel admins can create a Campfire workspace for this channel.",
			)
			return
		}

		workspace, err := workspaceService.Create(r.Context(), request.ToServiceInput(user.ID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateWorkspace(w, http.StatusCreated, CreateWorkspaceResponse{
			Workspace: WorkspaceToPayload(*workspace),
		})
	}
}

/*
canCreateWorkspace returns whether a user may configure Campfire for a channel.
*/
func canCreateWorkspace(
	log logger.Logger,
	mm mattermost.Client,
	user *mattermost.User,
	channelID string,
) bool {
	if user == nil {
		return false
	}

	if user.IsSystemAdmin {
		return true
	}

	return userIsChannelAdmin(log, mm, channelID, user.ID)
}

/*
userIsChannelAdmin checks Mattermost channel admin status without breaking the request
on lookup failures.

A failure to prove channel admin status should not grant permission.
*/
func userIsChannelAdmin(
	log logger.Logger,
	mm mattermost.Client,
	channelID string,
	userID string,
) bool {
	isChannelAdmin, err := mm.IsChannelAdmin(channelID, userID)
	if err != nil {
		log.Warn(
			"failed to check Mattermost channel admin status",
			logger.String("channel_id", channelID),
			logger.String("user_id", userID),
			logger.String("error", err.Error()),
		)
		return false
	}

	return isChannelAdmin
}

/*
capabilitiesForUser returns the workspace capabilities sent to the frontend.

This is the immediate capability bridge until a dedicated PermissionService is
wired through every service. The backend still needs deeper per-action checks,
but this fixes the broken UI state where system admins and channel admins were
shown as read-only.
*/
func capabilitiesForUser(isSystemAdmin bool, canManageWorkspace bool) service.WorkspaceCapabilities {
	if isSystemAdmin {
		return service.WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      true,
			CanManageStandups:       true,
			CanViewWorkspaceReports: true,
			CanApproveLeaves:        true,
			CanViewGlobalReports:    true,
			CanExportReports:        true,
		}
	}

	if canManageWorkspace {
		return service.WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      true,
			CanManageStandups:       true,
			CanViewWorkspaceReports: true,
			CanApproveLeaves:        true,
			CanViewGlobalReports:    false,
			CanExportReports:        true,
		}
	}

	return service.WorkspaceCapabilities{
		CanSubmitStandup:        true,
		CanManageWorkspace:      false,
		CanManageStandups:       false,
		CanViewWorkspaceReports: false,
		CanApproveLeaves:        false,
		CanViewGlobalReports:    false,
		CanExportReports:        false,
	}
}

/*
logServiceError writes service failures to plugin logs.
*/
func logServiceError(log logger.Logger, err error) {
	if serviceError, ok := service.AsError(err); ok {
		log.Debug(
			"service error",
			logger.String("code", string(serviceError.Code)),
			logger.String("message", serviceError.Message),
		)
		return
	}

	log.Warn("unexpected service error", logger.String("message", err.Error()))
}
