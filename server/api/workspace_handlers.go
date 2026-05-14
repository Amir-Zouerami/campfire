package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
handleGetWorkspaceByChannel handles current-channel workspace lookup.
*/
func handleGetWorkspaceByChannel(
	log logger.Logger,
	workspaceService *service.WorkspaceService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := strings.TrimSpace(r.Header.Get("Mattermost-User-Id"))
		channelID := strings.TrimSpace(chi.URLParam(r, "channelID"))

		result, err := workspaceService.GetByChannel(r.Context(), userID, channelID)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteWorkspaceByChannel(w, http.StatusOK, WorkspaceResultToResponse(*result))
	}
}

/*
handleCreateWorkspace handles workspace creation requests.
*/
func handleCreateWorkspace(
	log logger.Logger,
	workspaceService *service.WorkspaceService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := strings.TrimSpace(r.Header.Get("Mattermost-User-Id"))
		var request CreateWorkspaceRequest

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		workspace, err := workspaceService.Create(r.Context(), request.ToServiceInput(userID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteCreateWorkspace(w, http.StatusCreated, CreateWorkspaceResponse{
			Workspace: WorkspaceToPayload(*workspace),
		})
	}
}

/*
logServiceError writes service failures to plugin logs.
*/
func logServiceError(log logger.Logger, err error) {
	if serviceError, ok := service.AsError(err); ok {
		log.Debug(
			"service error",
			logger.String("code", string(serviceError.Code)),
			logger.String("message", serviceError.Message),
		)
		return
	}

	log.Warn("unexpected service error", logger.String("message", err.Error()))
}
