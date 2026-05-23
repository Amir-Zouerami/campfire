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
handleListWorkspaceRoles handles workspace role/settings overview.
*/
func handleListWorkspaceRoles(
	log logger.Logger,
	mm mattermost.Client,
	workspaceRoleService *service.WorkspaceRoleService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		overview, err := workspaceRoleService.List(r.Context(), service.ListWorkspaceRolesInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListWorkspaceRoles(w, http.StatusOK, ListWorkspaceRolesResponse{
			Roles: WorkspaceRoleOverviewToPayload(*overview),
		})
	}
}

/*
handleUpsertWorkspaceRole handles adding a named workspace role.
*/
func handleUpsertWorkspaceRole(
	log logger.Logger,
	mm mattermost.Client,
	workspaceRoleService *service.WorkspaceRoleService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		var request UpsertWorkspaceRoleRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		overview, err := workspaceRoleService.Upsert(
			r.Context(),
			request.ToServiceInput(user.ID, user.IsSystemAdmin, workspaceID),
		)
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
			"role_assigned",
			"workspace_role_assignment",
			request.UserID+":"+request.Role,
			map[string]string{
				"user_id": request.UserID,
				"role":    request.Role,
			},
		)

		WriteUpsertWorkspaceRole(w, http.StatusOK, UpsertWorkspaceRoleResponse{
			Roles: WorkspaceRoleOverviewToPayload(*overview),
		})
	}
}

/*
handleDeleteWorkspaceRole handles removing a named workspace role.
*/
func handleDeleteWorkspaceRole(
	log logger.Logger,
	mm mattermost.Client,
	workspaceRoleService *service.WorkspaceRoleService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		role := strings.TrimSpace(chi.URLParam(r, "role"))
		targetUserID := strings.TrimSpace(chi.URLParam(r, "userID"))

		result, err := workspaceRoleService.Delete(r.Context(), service.DeleteWorkspaceRoleInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			UserID:        targetUserID,
			Role:          role,
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
			"role_removed",
			"workspace_role_assignment",
			targetUserID+":"+role,
			map[string]string{
				"user_id": targetUserID,
				"role":    role,
				"deleted": boolLabel(result.Deleted),
			},
		)

		WriteDeleteWorkspaceRole(w, http.StatusOK, DeleteWorkspaceRoleResponse{
			Deleted: result.Deleted,
			Roles:   WorkspaceRoleOverviewToPayload(result.Roles),
		})
	}
}
