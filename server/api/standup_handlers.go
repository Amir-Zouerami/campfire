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
handleCreateStandupTemplate handles creating a standup template.
*/
func handleCreateStandupTemplate(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		var request CreateStandupTemplateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		isActive := true
		if request.IsActive != nil {
			isActive = *request.IsActive
		}

		template, err := standupService.CreateTemplate(r.Context(), service.CreateStandupTemplateInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			Name:          request.Name,
			Description:   request.Description,
			Kind:          request.Kind,
			IsActive:      isActive,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateStandupTemplate(w, http.StatusCreated, CreateStandupTemplateResponse{
			Template: StandupTemplateToPayload(*template),
		})
	}
}

/*
handleUpdateStandupTemplate handles updating a standup template.
*/
func handleUpdateStandupTemplate(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		templateID := strings.TrimSpace(chi.URLParam(r, "templateID"))

		var request UpdateStandupTemplateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		template, err := standupService.UpdateTemplate(r.Context(), service.UpdateStandupTemplateInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			TemplateID:    templateID,
			Name:          request.Name,
			Description:   request.Description,
			Kind:          request.Kind,
			IsActive:      request.IsActive,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateStandupTemplate(w, http.StatusOK, UpdateStandupTemplateResponse{
			Template: StandupTemplateToPayload(*template),
		})
	}
}

/*
handleDeleteStandupTemplate handles deleting a standup template and dependent rows.
*/
func handleDeleteStandupTemplate(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		templateID := strings.TrimSpace(chi.URLParam(r, "templateID"))

		if err := standupService.DeleteTemplate(r.Context(), service.DeleteStandupTemplateInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			TemplateID:    templateID,
		}); err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			workspaceID,
			user.ID,
			"standup_template_deleted",
			"standup_template",
			templateID,
			map[string]string{},
		)

		WriteDeleteStandupTemplate(w, http.StatusOK, DeleteStandupTemplateResponse{Deleted: true})
	}
}

/*
handleCreateStandupQuestion handles creating a standup question.
*/
func handleCreateStandupQuestion(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		var request CreateStandupQuestionRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		question, err := standupService.CreateQuestion(r.Context(), service.CreateStandupQuestionInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			TemplateID:    request.TemplateID,
			Section:       request.Section,
			Label:         request.Label,
			HelpText:      request.HelpText,
			Placeholder:   request.Placeholder,
			Type:          request.Type,
			Required:      request.Required,
			ShowInReport:  request.ShowInReport,
			IsPrivate:     request.IsPrivate,
			CreatesTasks:  request.CreatesTasks,
			Position:      request.Position,
			Options:       request.Options,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateStandupQuestion(w, http.StatusCreated, CreateStandupQuestionResponse{
			Question: StandupQuestionToPayload(*question),
		})
	}
}

/*
handleUpdateStandupQuestion handles updating a standup question.
*/
func handleUpdateStandupQuestion(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		questionID := strings.TrimSpace(chi.URLParam(r, "questionID"))

		var request UpdateStandupQuestionRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		question, err := standupService.UpdateQuestion(r.Context(), service.UpdateStandupQuestionInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			QuestionID:    questionID,
			TemplateID:    request.TemplateID,
			Section:       request.Section,
			Label:         request.Label,
			HelpText:      request.HelpText,
			Placeholder:   request.Placeholder,
			Type:          request.Type,
			Required:      request.Required,
			ShowInReport:  request.ShowInReport,
			IsPrivate:     request.IsPrivate,
			CreatesTasks:  request.CreatesTasks,
			Position:      request.Position,
			Options:       request.Options,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateStandupQuestion(w, http.StatusOK, UpdateStandupQuestionResponse{
			Question: StandupQuestionToPayload(*question),
		})
	}
}

/*
handleDeleteStandupQuestion handles deleting a standup question and dependent answers.
*/
func handleDeleteStandupQuestion(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		questionID := strings.TrimSpace(chi.URLParam(r, "questionID"))

		if err := standupService.DeleteQuestion(r.Context(), service.DeleteStandupQuestionInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			QuestionID:    questionID,
		}); err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			workspaceID,
			user.ID,
			"standup_question_deleted",
			"standup_question",
			questionID,
			map[string]string{},
		)

		WriteDeleteStandupQuestion(w, http.StatusOK, DeleteStandupQuestionResponse{Deleted: true})
	}
}

/*
handleCreateStandupSchedule handles creating a standup schedule.
*/
func handleCreateStandupSchedule(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		var request CreateStandupScheduleRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		schedule, err := standupService.CreateSchedule(r.Context(), service.CreateStandupScheduleInput{
			ActorUserID:             user.ID,
			IsSystemAdmin:           user.IsSystemAdmin,
			WorkspaceID:             workspaceID,
			TemplateID:              request.TemplateID,
			Kind:                    request.Kind,
			Enabled:                 request.Enabled,
			OpensAt:                 request.OpensAt,
			TimeOfDay:               request.TimeOfDay,
			SkipNonWorkingDays:      request.SkipNonWorkingDays,
			WeeklyMode:              request.WeeklyMode,
			SkipDailyWhenWeeklyRuns: request.SkipDailyWhenWeeklyRuns,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateStandupSchedule(w, http.StatusCreated, CreateStandupScheduleResponse{
			Schedule: StandupScheduleToPayload(*schedule),
		})
	}
}

/*
handleUpdateStandupSchedule handles updating a standup schedule.
*/
func handleUpdateStandupSchedule(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		scheduleID := strings.TrimSpace(chi.URLParam(r, "scheduleID"))

		var request UpdateStandupScheduleRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		schedule, err := standupService.UpdateSchedule(r.Context(), service.UpdateStandupScheduleInput{
			ActorUserID:             user.ID,
			IsSystemAdmin:           user.IsSystemAdmin,
			WorkspaceID:             workspaceID,
			ScheduleID:              scheduleID,
			TemplateID:              request.TemplateID,
			Kind:                    request.Kind,
			Enabled:                 request.Enabled,
			OpensAt:                 request.OpensAt,
			TimeOfDay:               request.TimeOfDay,
			SkipNonWorkingDays:      request.SkipNonWorkingDays,
			WeeklyMode:              request.WeeklyMode,
			SkipDailyWhenWeeklyRuns: request.SkipDailyWhenWeeklyRuns,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateStandupSchedule(w, http.StatusOK, UpdateStandupScheduleResponse{
			Schedule: StandupScheduleToPayload(*schedule),
		})
	}
}

/*
handleDeleteStandupSchedule handles deleting a standup schedule and dependent rows.
*/
func handleDeleteStandupSchedule(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	permissionService *service.PermissionService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		if !requireManageStandups(w, r, log, permissionService, user, workspaceID) {
			return
		}

		scheduleID := strings.TrimSpace(chi.URLParam(r, "scheduleID"))

		if err := standupService.DeleteSchedule(r.Context(), service.DeleteStandupScheduleInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			ScheduleID:    scheduleID,
		}); err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			workspaceID,
			user.ID,
			"standup_schedule_deleted",
			"standup_schedule",
			scheduleID,
			map[string]string{},
		)

		WriteDeleteStandupSchedule(w, http.StatusOK, DeleteStandupScheduleResponse{Deleted: true})
	}
}

/*
handleListStandupConfiguration handles standup configuration listing.

This endpoint intentionally remains available to signed-in workspace users
because My Day needs the active standup form configuration to render personal
submission controls.
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
			ActorUserID:     user.ID,
			IsSystemAdmin:   user.IsSystemAdmin,
			WorkspaceID:     workspaceID,
			IncludeInactive: parseBoolQuery(r, "includeInactive"),
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

/*
parseBoolQuery accepts the small set of boolean query forms used by the
Campfire webapp. Unknown values stay false so public active-only endpoints do
not accidentally broaden their response.
*/
func parseBoolQuery(r *http.Request, name string) bool {
	switch strings.ToLower(strings.TrimSpace(r.URL.Query().Get(name))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

/*
handleGetMyStandupSubmission handles loading the current user's stored standup
answers for one date/template so members can correct previous valid standups.
*/
func handleGetMyStandupSubmission(
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

		submission, err := standupService.GetMySubmission(r.Context(), service.GetMyStandupSubmissionInput{
			ActorUserID:    user.ID,
			WorkspaceID:    workspaceID,
			OccurrenceDate: r.URL.Query().Get("occurrenceDate"),
			TemplateID:     r.URL.Query().Get("templateId"),
			ScheduleID:     r.URL.Query().Get("scheduleId"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetMyStandupSubmission(w, http.StatusOK, MyStandupSubmissionToPayload(submission))
	}
}

/*
handleListStandupSubmissions handles listing submissions for one workspace occurrence date.
*/
func handleListStandupSubmissions(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
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

		summary, err := standupService.ListSubmissions(r.Context(), service.ListStandupSubmissionsInput{
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

		WriteListStandupSubmissions(
			w,
			http.StatusOK,
			StandupOccurrenceSummaryToPayload(*summary),
		)
	}
}

/*
handleSubmitStandup handles creating or updating a standup submission.
*/
func handleSubmitStandup(
	log logger.Logger,
	mm mattermost.Client,
	standupService *service.StandupService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request SubmitStandupRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		result, err := standupService.Submit(r.Context(), request.ToServiceInput(user.ID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			result.Submission.WorkspaceID.String(),
			user.ID,
			"standup_submitted",
			"standup_submission",
			result.Submission.ID.String(),
			map[string]string{
				"occurrence_date": string(result.Submission.OccurrenceDate),
				"status":          string(result.Submission.Status),
			},
		)

		WriteSubmitStandup(w, http.StatusCreated, SubmitStandupResponse{
			Submission:   StandupSubmissionToPayload(result.Submission),
			Answers:      StandupAnswersToPayload(result.Answers),
			CreatedTasks: TasksToPayload(result.CreatedTasks),
		})
	}
}
