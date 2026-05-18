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
handleLookupUsers handles resolving Mattermost user IDs to profile payloads.
*/
func handleLookupUsers(
	log logger.Logger,
	mm mattermost.Client,
	userDirectoryService *service.UserDirectoryService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request LookupUsersRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		profiles, err := userDirectoryService.Lookup(r.Context(), service.LookupUsersInput{
			ActorUserID: user.ID,
			UserIDs:     request.UserIDs,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteLookupUsers(w, http.StatusOK, LookupUsersResponse{
			Users: UserProfilesToPayload(profiles),
		})
	}
}

/*
handleListWorkspaceMembers handles listing Mattermost users in a workspace channel.
*/
func handleListWorkspaceMembers(
	log logger.Logger,
	mm mattermost.Client,
	workspaceMemberDirectoryService *service.WorkspaceMemberDirectoryService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		profiles, err := workspaceMemberDirectoryService.List(r.Context(), service.ListWorkspaceMembersInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListWorkspaceMembers(w, http.StatusOK, ListWorkspaceMembersResponse{
			Users: UserProfilesToPayload(profiles),
		})
	}
}
