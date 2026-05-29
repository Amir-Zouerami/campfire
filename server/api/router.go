package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
RouterConfig contains dependencies needed by the HTTP API layer.
*/
type RouterConfig struct {
	Logger                          logger.Logger
	Mattermost                      mattermost.Client
	WorkspaceService                *service.WorkspaceService
	PermissionService               *service.PermissionService
	UserDirectoryService            *service.UserDirectoryService
	WorkspaceMemberDirectoryService *service.WorkspaceMemberDirectoryService
	WorkspaceRoleService            *service.WorkspaceRoleService
	WorkspaceCalendarService        *service.WorkspaceCalendarService
	ReminderService                 *service.ReminderService
	GlobalSkipDateService           *service.GlobalSkipDateService
	LeaveValidationService          *service.LeaveValidationService
	LeaveService                    *service.LeaveService
	StandupRuntimeService           *service.StandupRuntimeService
	StandupService                  *service.StandupService
	ReportService                   *service.ReportService
	TimeReportService               *service.TimeReportService
	GlobalReportService             *service.GlobalReportService
	GlobalLeaveReportService        *service.GlobalLeaveReportService
	SavedReportFilterService        *service.SavedReportFilterService
	ExportService                   *service.ExportService
	TaskService                     *service.TaskService
	AuditService                    *service.AuditService
}

/*
NewRouter builds the Campfire HTTP API router.

Route handlers should parse requests and delegate business logic to services.
They should not contain domain rules.
*/
func NewRouter(config RouterConfig) http.Handler {
	router := chi.NewRouter()

	router.NotFound(handleAPINotFound())
	router.MethodNotAllowed(handleAPIMethodNotAllowed())

	router.Route("/api/v1", func(api chi.Router) {
		api.Get("/health", handleHealth(config.Logger))
		api.Get("/me", handleMe(config.Logger, config.Mattermost))
		api.Post("/users/lookup", handleLookupUsers(config.Logger, config.Mattermost, config.UserDirectoryService))

		api.Get(
			"/workspaces/by-channel/{channelID}",
			handleGetWorkspaceByChannel(
				config.Logger,
				config.Mattermost,
				config.WorkspaceService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces",
			handleCreateWorkspace(
				config.Logger,
				config.Mattermost,
				config.WorkspaceService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/notification-settings",
			handleUpdateWorkspaceNotificationSettings(
				config.Logger,
				config.Mattermost,
				config.WorkspaceService,
				config.PermissionService,
			),
		)
		api.Delete(
			"/workspaces/{workspaceID}",
			handleDeleteWorkspace(
				config.Logger,
				config.Mattermost,
				config.WorkspaceService,
				config.PermissionService,
				config.AuditService,
			),
		)

		api.Get(
			"/workspaces/{workspaceID}/members",
			handleListWorkspaceMembers(config.Logger, config.Mattermost, config.WorkspaceMemberDirectoryService),
		)
		api.Get(
			"/workspaces/{workspaceID}/roles",
			handleListWorkspaceRoles(config.Logger, config.Mattermost, config.WorkspaceRoleService),
		)
		api.Post(
			"/workspaces/{workspaceID}/roles",
			handleUpsertWorkspaceRole(
				config.Logger,
				config.Mattermost,
				config.WorkspaceRoleService,
				config.AuditService,
			),
		)
		api.Delete(
			"/workspaces/{workspaceID}/roles/{role}/{userID}",
			handleDeleteWorkspaceRole(
				config.Logger,
				config.Mattermost,
				config.WorkspaceRoleService,
				config.AuditService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/audit",
			handleListAuditLog(config.Logger, config.Mattermost, config.AuditService, config.PermissionService),
		)

		api.Get(
			"/workspaces/{workspaceID}/working-days",
			handleListWorkspaceWorkingDays(
				config.Logger,
				config.Mattermost,
				config.WorkspaceCalendarService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/working-days",
			handleUpdateWorkspaceWorkingDays(
				config.Logger,
				config.Mattermost,
				config.WorkspaceCalendarService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/off-days",
			handleListWorkspaceOffDays(
				config.Logger,
				config.Mattermost,
				config.WorkspaceCalendarService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/off-days",
			handleCreateWorkspaceOffDay(
				config.Logger,
				config.Mattermost,
				config.WorkspaceCalendarService,
				config.PermissionService,
			),
		)
		api.Delete(
			"/workspaces/{workspaceID}/off-days/{offDayID}",
			handleDeleteWorkspaceOffDay(
				config.Logger,
				config.Mattermost,
				config.WorkspaceCalendarService,
				config.PermissionService,
			),
		)

		api.Get(
			"/workspaces/{workspaceID}/reminders",
			handleListReminderRules(
				config.Logger,
				config.Mattermost,
				config.ReminderService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/reminders/{reminderRuleID}",
			handleUpdateReminderRule(
				config.Logger,
				config.Mattermost,
				config.ReminderService,
				config.PermissionService,
			),
		)

		api.Get(
			"/workspaces/{workspaceID}/standups/configuration",
			handleListStandupConfiguration(config.Logger, config.Mattermost, config.StandupService),
		)
		api.Post(
			"/workspaces/{workspaceID}/standups/templates",
			handleCreateStandupTemplate(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/standups/templates/{templateID}",
			handleUpdateStandupTemplate(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/standups/questions",
			handleCreateStandupQuestion(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/standups/questions/{questionID}",
			handleUpdateStandupQuestion(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/standups/schedules",
			handleCreateStandupSchedule(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/standups/schedules/{scheduleID}",
			handleUpdateStandupSchedule(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/standups/my-submission",
			handleGetMyStandupSubmission(
				config.Logger,
				config.Mattermost,
				config.StandupService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/standups/submissions",
			handleListStandupSubmissions(
				config.Logger,
				config.Mattermost,
				config.StandupService,
				config.PermissionService,
			),
		)
		api.Post(
			"/standups/submissions",
			handleSubmitStandup(config.Logger, config.Mattermost, config.StandupService, config.AuditService),
		)
		api.Get(
			"/workspaces/{workspaceID}/standup-runtime/day",
			handleEvaluateStandupDay(config.Logger, config.Mattermost, config.StandupRuntimeService),
		)

		api.Get(
			"/workspaces/{workspaceID}/tasks/my",
			handleListMyTasks(config.Logger, config.Mattermost, config.TaskService),
		)
		api.Post(
			"/workspaces/{workspaceID}/tasks",
			handleCreateTask(config.Logger, config.Mattermost, config.TaskService, config.AuditService),
		)
		api.Put(
			"/workspaces/{workspaceID}/tasks/{taskID}",
			handleUpdateTask(config.Logger, config.Mattermost, config.TaskService, config.AuditService),
		)
		api.Get(
			"/workspaces/{workspaceID}/time-entries/my",
			handleListMyTimeEntries(config.Logger, config.Mattermost, config.TaskService),
		)
		api.Post(
			"/workspaces/{workspaceID}/time-entries",
			handleCreateTimeEntry(config.Logger, config.Mattermost, config.TaskService, config.AuditService),
		)

		api.Get(
			"/workspaces/{workspaceID}/reports/rules",
			handleListReportRules(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.PermissionService,
			),
		)
		api.Put(
			"/workspaces/{workspaceID}/reports/rules/{reportRuleID}",
			handleUpdateReportRule(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/weekly-preview",
			handleGetWeeklyReportPreview(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/reports/weekly-preview/post",
			handlePostWeeklyReportPreview(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.AuditService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/daily-preview",
			handleGetDailyReportPreview(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/reports/daily-preview/post",
			handlePostDailyReportPreview(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.AuditService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/time-summary",
			handleGetTimeReportSummary(
				config.Logger,
				config.Mattermost,
				config.TimeReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/reports/global/time-summary",
			handleGetGlobalTimeReportSummary(
				config.Logger,
				config.Mattermost,
				config.GlobalReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/reports/global/time/export.csv",
			handleExportGlobalTimeReportCSV(
				config.Logger,
				config.Mattermost,
				config.GlobalReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/reports/global/leaves",
			handleGetGlobalLeaveReportSummary(
				config.Logger,
				config.Mattermost,
				config.GlobalLeaveReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/reports/global/leaves/export.csv",
			handleExportGlobalLeaveReportCSV(
				config.Logger,
				config.Mattermost,
				config.GlobalLeaveReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/daily-runs",
			handleListDailyReportRuns(
				config.Logger,
				config.Mattermost,
				config.ReportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/saved-filters",
			handleListSavedReportFilters(
				config.Logger,
				config.Mattermost,
				config.SavedReportFilterService,
				config.PermissionService,
			),
		)
		api.Post(
			"/workspaces/{workspaceID}/reports/saved-filters",
			handleCreateSavedReportFilter(
				config.Logger,
				config.Mattermost,
				config.SavedReportFilterService,
				config.AuditService,
				config.PermissionService,
			),
		)
		api.Delete(
			"/workspaces/{workspaceID}/reports/saved-filters/{filterID}",
			handleDeleteSavedReportFilter(
				config.Logger,
				config.Mattermost,
				config.SavedReportFilterService,
				config.AuditService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/time/export.csv",
			handleExportWorkspaceTimeCSV(
				config.Logger,
				config.Mattermost,
				config.ExportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/leaves/export.csv",
			handleExportWorkspaceLeavesCSV(
				config.Logger,
				config.Mattermost,
				config.ExportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/standups/export.csv",
			handleExportWorkspaceStandupSubmissionsCSV(
				config.Logger,
				config.Mattermost,
				config.ExportService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/reports/missing/export.csv",
			handleExportWorkspaceMissingStandupsCSV(
				config.Logger,
				config.Mattermost,
				config.ExportService,
				config.PermissionService,
			),
		)

		api.Get(
			"/workspaces/{workspaceID}/leave-types",
			handleListLeaveTypes(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/pending",
			handleListPendingLeaveRequests(
				config.Logger,
				config.Mattermost,
				config.LeaveService,
				config.PermissionService,
			),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/my-pending",
			handleListMyPendingLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/my-active",
			handleListMyActiveLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/approved",
			handleListApprovedLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)

		api.Get(
			"/settings/global/skip-dates",
			handleListGlobalSkipDates(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)
		api.Post(
			"/settings/global/skip-dates",
			handleCreateGlobalSkipDate(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)
		api.Delete(
			"/settings/global/skip-dates/{skipDateID}",
			handleDeleteGlobalSkipDate(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)

		api.Post(
			"/leaves/validate",
			handleValidateLeave(config.Logger, config.Mattermost, config.LeaveValidationService),
		)
		api.Post(
			"/leaves",
			handleCreateLeave(config.Logger, config.Mattermost, config.LeaveService, config.AuditService),
		)
		api.Post(
			"/leaves/{leaveRequestID}/decision",
			handleDecideLeave(
				config.Logger,
				config.Mattermost,
				config.LeaveService,
				config.AuditService,
			),
		)
		api.Post(
			"/leaves/{leaveRequestID}/cancel",
			handleCancelLeave(config.Logger, config.Mattermost, config.LeaveService, config.AuditService),
		)
	})

	return router
}

/*
handleHealth returns basic plugin health information.

This endpoint proves that the Mattermost server plugin and HTTP router are
wired correctly before deeper Campfire features are added.
*/
func handleHealth(log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Debug("health check requested", logger.String("path", r.URL.Path))

		WriteHealth(w, http.StatusOK, HealthResponse{
			Status:  "ok",
			Product: "Campfire",
			Version: "0.1.0",
		})
	}
}

/*
handleMe returns the currently authenticated Mattermost user.
*/
func handleMe(log logger.Logger, mm mattermost.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		WriteMe(w, http.StatusOK, MeResponse{
			User: MeUserResponse{
				ID:          user.ID,
				Username:    user.Username,
				DisplayName: user.DisplayName,
				Email:       user.Email,
			},
			IsSystemAdmin: user.IsSystemAdmin,
		})
	}
}

/*
handleAPINotFound writes a JSON API error for unmatched Campfire routes.

This prevents Chi's plain-text "404 page not found" response from leaking into
the frontend and lets the UI render a typed API error.
*/
func handleAPINotFound() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, http.StatusNotFound, "route_not_found", "Campfire API route was not found.")
	}
}

/*
handleAPIMethodNotAllowed writes a JSON API error for valid routes with invalid methods.
*/
func handleAPIMethodNotAllowed() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Campfire API method is not allowed.")
	}
}
