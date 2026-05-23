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
handleListReportRules handles listing workspace report settings.
*/
func handleListReportRules(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		rules, err := reportService.ListRules(r.Context(), service.ListReportRulesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListReportRules(w, http.StatusOK, ListReportRulesResponse{
			ReportRules: ReportRulesToPayload(rules),
		})
	}
}

/*
handleUpdateReportRule handles updating one workspace report rule.
*/
func handleUpdateReportRule(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageWorkspace(w, r, log, permissionService, user, workspaceID) {
			return
		}

		reportRuleID := strings.TrimSpace(chi.URLParam(r, "reportRuleID"))

		var request UpdateReportRuleRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		rule, err := reportService.UpdateRule(r.Context(), service.UpdateReportRuleInput{
			ActorUserID:     user.ID,
			IsSystemAdmin:   user.IsSystemAdmin,
			WorkspaceID:     workspaceID,
			ReportRuleID:    reportRuleID,
			Enabled:         request.Enabled,
			PostToChannel:   request.PostToChannel,
			PreviewRequired: request.PreviewRequired,
			SortMode:        request.SortMode,
			IncludeOnLeave:  request.IncludeOnLeave,
			IncludeMissing:  request.IncludeMissing,
			IncludeTime:     request.IncludeTime,
			IncludeBlockers: request.IncludeBlockers,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateReportRule(w, http.StatusOK, UpdateReportRuleResponse{
			ReportRule: ReportRuleToPayload(*rule),
		})
	}
}

/*
handleGetWeeklyReportPreview handles weekly report preview generation.
*/
func handleGetWeeklyReportPreview(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireViewWorkspaceReports(w, r, log, permissionService, user, workspaceID) {
			return
		}

		preview, err := reportService.BuildWeeklyPreview(r.Context(), service.BuildWeeklyReportPreviewInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			PeriodStart: r.URL.Query().Get("periodStart"),
			PeriodEnd:   r.URL.Query().Get("periodEnd"),
			SortMode:    r.URL.Query().Get("sortMode"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetWeeklyReportPreview(w, http.StatusOK, GetWeeklyReportPreviewResponse{
			Preview: WeeklyReportPreviewToPayload(*preview),
		})
	}
}

/*
handleGetDailyReportPreview handles daily report preview generation.
*/
func handleGetDailyReportPreview(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireViewWorkspaceReports(w, r, log, permissionService, user, workspaceID) {
			return
		}

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
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireViewWorkspaceReports(w, r, log, permissionService, user, workspaceID) {
			return
		}

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
handlePostWeeklyReportPreview handles posting a weekly report preview to the channel.
*/
func handlePostWeeklyReportPreview(
	log logger.Logger,
	mm mattermost.Client,
	reportService *service.ReportService,
	auditService *service.AuditService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireExportReports(w, r, log, permissionService, user, workspaceID) {
			return
		}

		result, err := reportService.PostWeeklyPreview(r.Context(), service.PostWeeklyReportPreviewInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			PeriodStart:   r.URL.Query().Get("periodStart"),
			PeriodEnd:     r.URL.Query().Get("periodEnd"),
			SortMode:      r.URL.Query().Get("sortMode"),
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
			"weekly_report_posted",
			"report_run",
			result.Run.ID.String(),
			map[string]string{
				"period_start": string(result.Preview.PeriodStart),
				"period_end":   string(result.Preview.PeriodEnd),
				"posted":       strconv.FormatBool(result.Posted),
			},
		)

		WritePostWeeklyReportPreview(w, http.StatusOK, PostWeeklyReportPreviewResponse{
			Preview: WeeklyReportPreviewToPayload(result.Preview),
			Run:     ReportRunToPayload(result.Run),
			Posted:  result.Posted,
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
	auditService *service.AuditService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireExportReports(w, r, log, permissionService, user, workspaceID) {
			return
		}

		result, err := reportService.PostDailyPreview(r.Context(), service.PostDailyReportPreviewInput{
			ActorUserID:    user.ID,
			IsSystemAdmin:  user.IsSystemAdmin,
			WorkspaceID:    workspaceID,
			OccurrenceDate: r.URL.Query().Get("occurrenceDate"),
			SortMode:       r.URL.Query().Get("sortMode"),
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
			"daily_report_posted",
			"report_run",
			result.Run.ID.String(),
			map[string]string{
				"occurrence_date": string(result.Preview.OccurrenceDate),
				"posted":          strconv.FormatBool(result.Posted),
			},
		)

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
