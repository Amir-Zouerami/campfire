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
handleListSavedReportFilters handles listing current-user saved report filters.
*/
func handleListSavedReportFilters(
	log logger.Logger,
	mm mattermost.Client,
	savedFilterService *service.SavedReportFilterService,
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

		filters, err := savedFilterService.List(r.Context(), service.ListSavedReportFiltersInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			ReportType:  r.URL.Query().Get("reportType"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListSavedReportFilters(w, http.StatusOK, ListSavedReportFiltersResponse{
			Filters: SavedReportFiltersToPayload(filters),
		})
	}
}

/*
handleCreateSavedReportFilter handles creating a current-user saved report filter.
*/
func handleCreateSavedReportFilter(
	log logger.Logger,
	mm mattermost.Client,
	savedFilterService *service.SavedReportFilterService,
	auditService *service.AuditService,
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

		var request CreateSavedReportFilterRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		filter, err := savedFilterService.Create(r.Context(), service.CreateSavedReportFilterInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			Name:        request.Name,
			Scope:       request.Scope,
			ReportType:  request.ReportType,
			FilterJSON:  request.FilterJSON,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			filter.WorkspaceID.String(),
			user.ID,
			"saved_filter_created",
			"saved_report_filter",
			filter.ID.String(),
			map[string]string{
				"name":        filter.Name,
				"report_type": string(filter.ReportType),
			},
		)

		WriteCreateSavedReportFilter(w, http.StatusCreated, CreateSavedReportFilterResponse{
			Filter: SavedReportFilterToPayload(*filter),
		})
	}
}

/*
handleDeleteSavedReportFilter handles deleting a current-user saved report filter.
*/
func handleDeleteSavedReportFilter(
	log logger.Logger,
	mm mattermost.Client,
	savedFilterService *service.SavedReportFilterService,
	auditService *service.AuditService,
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

		filterID := strings.TrimSpace(chi.URLParam(r, "filterID"))

		err := savedFilterService.Delete(r.Context(), service.DeleteSavedReportFilterInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			FilterID:    filterID,
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
			"saved_filter_deleted",
			"saved_report_filter",
			filterID,
			map[string]string{},
		)

		WriteDeleteSavedReportFilter(w, http.StatusOK, DeleteSavedReportFilterResponse{
			Deleted: true,
		})
	}
}
