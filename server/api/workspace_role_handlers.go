package api

import (
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
