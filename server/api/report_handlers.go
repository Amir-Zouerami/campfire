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
handleGetDailyReportPreview handles daily report preview generation.
*/
func handleGetDailyReportPreview(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		preview, err := reportService.BuildDailyPreview(r.Context(), service.BuildDailyReportPreviewInput{
			ActorUserID:    user.ID,
			WorkspaceID:    workspaceID,
			OccurrenceDate: r.URL.Query().Get("occurrenceDate"),
			SortMode:       r.URL.Query().Get("sortMode"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetDailyReportPreview(w, http.StatusOK, GetDailyReportPreviewResponse{
			Preview: DailyReportPreviewToPayload(*preview),
		})
	}
}
