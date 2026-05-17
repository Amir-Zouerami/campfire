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
handleGetTimeReportSummary handles workspace time report summary generation.
*/
func handleGetTimeReportSummary(
	log logger.Logger,
	mm mattermost.Client,
	timeReportService *service.TimeReportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		summary, err := timeReportService.GetSummary(r.Context(), service.GetTimeReportSummaryInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			StartDate:     r.URL.Query().Get("startDate"),
			EndDate:       r.URL.Query().Get("endDate"),
			GroupBy:       r.URL.Query().Get("groupBy"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetTimeReportSummary(w, http.StatusOK, GetTimeReportSummaryResponse{
			Summary: TimeReportSummaryToPayload(*summary),
		})
	}
}
