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
handleListGlobalSkipDates handles listing global Campfire off-days.
*/
func handleListGlobalSkipDates(
	log logger.Logger,
	mm mattermost.Client,
	globalSkipDateService *service.GlobalSkipDateService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		skipDates, err := globalSkipDateService.List(r.Context(), user.ID, user.IsSystemAdmin)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListGlobalSkipDates(w, http.StatusOK, ListGlobalSkipDatesResponse{
			SkipDates: GlobalSkipDatesToPayload(skipDates),
		})
	}
}

/*
handleCreateGlobalSkipDate handles creating a global Campfire off-day.
*/
func handleCreateGlobalSkipDate(
	log logger.Logger,
	mm mattermost.Client,
	globalSkipDateService *service.GlobalSkipDateService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request CreateGlobalSkipDateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		skipDate, err := globalSkipDateService.Create(r.Context(), service.CreateGlobalSkipDateInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			Date:          request.Date,
			Label:         request.Label,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateGlobalSkipDate(w, http.StatusCreated, CreateGlobalSkipDateResponse{
			SkipDate: GlobalSkipDateToPayload(*skipDate),
		})
	}
}

/*
handleDeleteGlobalSkipDate handles deleting a global Campfire off-day.
*/
func handleDeleteGlobalSkipDate(
	log logger.Logger,
	mm mattermost.Client,
	globalSkipDateService *service.GlobalSkipDateService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		skipDateID := strings.TrimSpace(chi.URLParam(r, "skipDateID"))

		err := globalSkipDateService.Delete(r.Context(), user.ID, user.IsSystemAdmin, skipDateID)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteDeleteGlobalSkipDate(w, http.StatusOK, DeleteGlobalSkipDateResponse{
			Deleted: true,
		})
	}
}
