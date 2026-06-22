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
handleGetDataRetentionPreview handles old operational-data purge previews.
*/
func handleGetDataRetentionPreview(
	log logger.Logger,
	mm mattermost.Client,
	dataRetentionService *service.DataRetentionService,
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

		summary, err := dataRetentionService.Preview(r.Context(), service.PreviewWorkspaceDataRetentionInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			CutoffDate:  r.URL.Query().Get("cutoffDate"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteGetDataRetentionPreview(w, http.StatusOK, GetDataRetentionPreviewResponse{
			Summary: DataRetentionSummaryToPayload(*summary),
		})
	}
}

/*
handlePurgeWorkspaceData handles irreversible old operational-data deletion.
*/
func handlePurgeWorkspaceData(
	log logger.Logger,
	mm mattermost.Client,
	dataRetentionService *service.DataRetentionService,
	auditService *service.AuditService,
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

		var request PurgeWorkspaceDataRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		summary, err := dataRetentionService.Purge(r.Context(), service.PurgeWorkspaceDataRetentionInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			CutoffDate:  request.CutoffDate,
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
			"data_retention_purged",
			"workspace_data",
			workspaceID,
			map[string]string{
				"cutoff_date": request.CutoffDate,
				"total_rows":  strconv.Itoa(summary.TotalRows),
			},
		)

		WritePurgeWorkspaceData(w, http.StatusOK, PurgeWorkspaceDataResponse{
			Summary: DataRetentionSummaryToPayload(*summary),
			Deleted: true,
		})
	}
}
