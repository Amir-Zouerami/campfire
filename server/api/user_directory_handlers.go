package api

import (
	"encoding/json"
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
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
