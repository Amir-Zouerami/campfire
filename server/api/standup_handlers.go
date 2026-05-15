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
handleListStandupConfiguration handles standup configuration listing.
*/
func handleListStandupConfiguration(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		configuration, err := standupService.ListConfiguration(r.Context(), service.ListStandupConfigurationInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListStandupConfiguration(
			w,
			http.StatusOK,
			StandupConfigurationToPayload(*configuration),
		)
	}
}
