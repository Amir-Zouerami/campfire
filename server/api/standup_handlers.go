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
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		var request CreateStandupTemplateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		template, err := standupService.CreateTemplate(r.Context(), service.CreateStandupTemplateInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			Name:          request.Name,
			Description:   request.Description,
			Kind:          request.Kind,
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
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
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
handleCreateStandupQuestion handles creating a standup question.
*/
func handleCreateStandupQuestion(
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
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
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

/*
handleListStandupSubmissions handles listing submissions for one workspace occurrence date.
*/
func handleListStandupSubmissions(
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

		WriteSubmitStandup(w, http.StatusCreated, SubmitStandupResponse{
			Submission: StandupSubmissionToPayload(result.Submission),
			Answers:    StandupAnswersToPayload(result.Answers),
		})
	}
}
