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
