package api

import (
	"encoding/json"
	"net/http"
	"strconv"
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

/*
handleListDailyReportRuns handles daily report posting history.
*/
func handleListDailyReportRuns(
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
		limit := parsePositiveIntOrDefault(r.URL.Query().Get("limit"), 20)

		runs, err := reportService.ListDailyRuns(r.Context(), service.ListDailyReportRunsInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			Limit:       limit,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListDailyReportRuns(w, http.StatusOK, ListDailyReportRunsResponse{
			Runs: ReportRunsToPayload(runs),
		})
	}
}

/*
handlePostDailyReportPreview handles posting a daily report preview to the channel.
*/
func handlePostDailyReportPreview(
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

		var request PostDailyReportPreviewRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		result, err := reportService.PostDailyPreview(r.Context(), service.PostDailyReportPreviewInput{
			ActorUserID:    user.ID,
			IsSystemAdmin:  user.IsSystemAdmin,
			WorkspaceID:    workspaceID,
			OccurrenceDate: request.OccurrenceDate,
			SortMode:       request.SortMode,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WritePostDailyReportPreview(w, http.StatusOK, PostDailyReportPreviewResponse{
			Preview: DailyReportPreviewToPayload(result.Preview),
			Run:     ReportRunToPayload(result.Run),
			Posted:  result.Posted,
		})
	}
}

/*
parsePositiveIntOrDefault parses a positive integer query parameter.
*/
func parsePositiveIntOrDefault(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}
