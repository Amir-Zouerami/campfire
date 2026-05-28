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
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		channelID := strings.TrimSpace(chi.URLParam(r, "channelID"))
		if !requireWorkspaceEligibleChannel(w, log, mm, channelID) {
			return
		}

		result, err := workspaceService.GetByChannel(r.Context(), user.ID, channelID)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		access, err := permissionService.GetWorkspaceAccess(r.Context(), result.Workspace, permissionUserFromMattermost(user))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		result.Capabilities = access.Capabilities

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
	permissionService *service.PermissionService,
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

		if !requireWorkspaceEligibleChannel(w, log, mm, request.ChannelID) {
			return
		}

		canCreate, err := permissionService.CanCreateWorkspace(r.Context(), request.ChannelID, permissionUserFromMattermost(user))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		if !canCreate {
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
handleUpdateWorkspaceNotificationSettings handles workspace notification routing updates.
*/
func handleUpdateWorkspaceNotificationSettings(
	log logger.Logger,
	mm mattermost.Client,
	workspaceService *service.WorkspaceService,
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

		var request UpdateWorkspaceNotificationSettingsRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		targetChannelID := strings.TrimSpace(request.ApprovedLeaveNotificationChannelID)
		if targetChannelID != "" && !requireWorkspaceEligibleChannel(w, log, mm, targetChannelID) {
			return
		}

		workspace, err := workspaceService.UpdateApprovedLeaveNotificationChannelID(
			r.Context(),
			request.ToServiceInput(user.ID, workspaceID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateWorkspaceNotificationSettings(w, http.StatusOK, UpdateWorkspaceNotificationSettingsResponse{
			Workspace: WorkspaceToPayload(*workspace),
		})
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

/*
requireWorkspaceEligibleChannel ensures Campfire only operates in workspace-safe Mattermost channels.

Direct messages cannot be Campfire workspaces because the plugin UI and
workflow context belong to team channels or group conversations.
*/
func requireWorkspaceEligibleChannel(
	w http.ResponseWriter,
	log logger.Logger,
	mm mattermost.Client,
	channelID string,
) bool {
	channelType, err := mm.GetChannelType(channelID)
	if err != nil {
		log.Warn(
			"failed to load Mattermost channel type",
			logger.String("channel_id", channelID),
			logger.String("error", err.Error()),
		)
		WriteError(w, http.StatusBadRequest, "invalid_channel", "Could not verify the Mattermost channel type.")
		return false
	}

	if workspaceEligibleChannelType(channelType) {
		return true
	}

	WriteError(
		w,
		http.StatusForbidden,
		"invalid_channel_type",
		"Campfire workspaces can only be used from channels or group conversations. Direct messages cannot become Campfire workspaces.",
	)
	return false
}

/*
workspaceEligibleChannelType returns whether a Mattermost channel type may host Campfire.
*/
func workspaceEligibleChannelType(channelType string) bool {
	switch strings.TrimSpace(channelType) {
	case "O", "P", "G":
		return true
	default:
		return false
	}
}

/*
permissionUserFromMattermost maps the Mattermost user boundary type to the
service-local permission user shape.
*/
func permissionUserFromMattermost(user *mattermost.User) service.PermissionUser {
	if user == nil {
		return service.PermissionUser{}
	}

	return service.PermissionUser{
		ID:            user.ID,
		IsSystemAdmin: user.IsSystemAdmin,
	}
}

/*
handleDeleteWorkspace handles disconnecting Campfire from a Mattermost channel.

The operation archives the workspace instead of hard-deleting data. Archived
workspaces are no longer returned by channel lookup or active scheduler queries.
*/
func handleDeleteWorkspace(
	log logger.Logger,
	mm mattermost.Client,
	workspaceService *service.WorkspaceService,
	permissionService *service.PermissionService,
	auditService *service.AuditService,
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

		deleted, err := workspaceService.Archive(r.Context(), service.ArchiveWorkspaceInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			workspaceID,
			user.ID,
			"workspace_archived",
			"workspace",
			workspaceID,
			map[string]string{
				"deleted": boolLabel(deleted),
			},
		)

		WriteDeleteWorkspace(w, http.StatusOK, DeleteWorkspaceResponse{
			Deleted: deleted,
		})
	}
}
