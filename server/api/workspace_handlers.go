package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/go-chi/chi/v5"
)

/*
handleGetWorkspaceByChannel handles current-channel workspace lookup.

Persistence is intentionally not implemented in this step. The SQL-backed store
will be added next, and this handler will delegate to WorkspaceService.
*/
func handleGetWorkspaceByChannel(log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		channelID := strings.TrimSpace(chi.URLParam(r, "channelID"))
		if channelID == "" {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Channel ID is required.")
			return
		}

		log.Debug("workspace lookup requested", logger.String("channel_id", channelID))

		WriteError(
			w,
			http.StatusNotFound,
			"workspace_not_configured",
			"Campfire is not configured for this channel yet.",
		)
	}
}

/*
handleCreateWorkspace handles workspace creation requests.

Persistence is intentionally not implemented in this step. The request is decoded
and lightly validated so the API contract is already real.
*/
func handleCreateWorkspace(log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request CreateWorkspaceRequest

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		if strings.TrimSpace(request.TeamID) == "" {
			WriteError(w, http.StatusBadRequest, "validation_failed", "Team ID is required.")
			return
		}

		if strings.TrimSpace(request.ChannelID) == "" {
			WriteError(w, http.StatusBadRequest, "validation_failed", "Channel ID is required.")
			return
		}

		if strings.TrimSpace(request.Name) == "" {
			WriteError(w, http.StatusBadRequest, "validation_failed", "Workspace name is required.")
			return
		}

		if strings.TrimSpace(request.Timezone) == "" {
			WriteError(w, http.StatusBadRequest, "validation_failed", "Timezone is required.")
			return
		}

		if len(request.WorkingDays) == 0 {
			WriteError(w, http.StatusBadRequest, "validation_failed", "At least one working day is required.")
			return
		}

		log.Debug("workspace creation requested", logger.String("channel_id", request.ChannelID))

		WriteError(
			w,
			http.StatusServiceUnavailable,
			"internal_error",
			"Workspace persistence is not connected yet.",
		)
	}
}
