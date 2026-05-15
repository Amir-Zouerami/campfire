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
handleEvaluateStandupDay handles standup runtime evaluation for one workspace date.
*/
func handleEvaluateStandupDay(
	log logger.Logger,
	mm mattermost.Client,
	standupRuntimeService *service.StandupRuntimeService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		decision, err := standupRuntimeService.EvaluateDay(r.Context(), service.EvaluateStandupDayInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			Date:        r.URL.Query().Get("date"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteEvaluateStandupDay(w, http.StatusOK, EvaluateStandupDayResponse{
			Decision: StandupRunDecisionToPayload(*decision),
		})
	}
}
