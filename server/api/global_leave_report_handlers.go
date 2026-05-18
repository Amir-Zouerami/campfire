package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
handleGetGlobalLeaveReportSummary handles global leave report summary generation.
*/
func handleGetGlobalLeaveReportSummary(
	log logger.Logger,
	mm mattermost.Client,
	globalLeaveReportService *service.GlobalLeaveReportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		summary, err := globalLeaveReportService.GetGlobalLeaveSummary(
			r.Context(),
			service.GetGlobalLeaveReportSummaryInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				StartDate:     r.URL.Query().Get("startDate"),
				EndDate:       r.URL.Query().Get("endDate"),
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetGlobalLeaveReportSummary(w, http.StatusOK, GetGlobalLeaveReportSummaryResponse{
			Summary: GlobalLeaveReportSummaryToPayload(*summary),
		})
	}
}
