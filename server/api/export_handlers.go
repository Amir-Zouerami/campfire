package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
handleExportWorkspaceTimeCSV handles workspace time CSV export.
*/
func handleExportWorkspaceTimeCSV(
	log logger.Logger,
	mm mattermost.Client,
	exportService *service.ExportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		csvBytes, err := exportService.ExportWorkspaceTimeCSV(r.Context(), service.ExportWorkspaceTimeCSVInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			StartDate:     r.URL.Query().Get("startDate"),
			EndDate:       r.URL.Query().Get("endDate"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		writeCSV(w, "campfire-time.csv", csvBytes)
	}
}

/*
handleExportWorkspaceStandupSubmissionsCSV handles workspace standup submissions CSV export.
*/
func handleExportWorkspaceStandupSubmissionsCSV(
	log logger.Logger,
	mm mattermost.Client,
	exportService *service.ExportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		csvBytes, err := exportService.ExportWorkspaceStandupSubmissionsCSV(
			r.Context(),
			service.ExportWorkspaceStandupSubmissionsCSVInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				WorkspaceID:   workspaceID,
				StartDate:     r.URL.Query().Get("startDate"),
				EndDate:       r.URL.Query().Get("endDate"),
				SortMode:      r.URL.Query().Get("sortMode"),
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		writeCSV(w, "campfire-standup-submissions.csv", csvBytes)
	}
}

/*
handleExportWorkspaceMissingStandupsCSV handles workspace missing standups CSV export.
*/
func handleExportWorkspaceMissingStandupsCSV(
	log logger.Logger,
	mm mattermost.Client,
	exportService *service.ExportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		csvBytes, err := exportService.ExportWorkspaceMissingStandupsCSV(
			r.Context(),
			service.ExportWorkspaceMissingStandupsCSVInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				WorkspaceID:   workspaceID,
				StartDate:     r.URL.Query().Get("startDate"),
				EndDate:       r.URL.Query().Get("endDate"),
				SortMode:      r.URL.Query().Get("sortMode"),
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		writeCSV(w, "campfire-missing-standups.csv", csvBytes)
	}
}

/*
handleExportWorkspaceLeavesCSV handles workspace approved-leave CSV export.
*/
func handleExportWorkspaceLeavesCSV(
	log logger.Logger,
	mm mattermost.Client,
	exportService *service.ExportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		csvBytes, err := exportService.ExportWorkspaceLeavesCSV(r.Context(), service.ExportWorkspaceLeavesCSVInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			StartDate:     r.URL.Query().Get("startDate"),
			EndDate:       r.URL.Query().Get("endDate"),
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		writeCSV(w, "campfire-leaves.csv", csvBytes)
	}
}

/*
writeCSV writes a downloadable CSV response.
*/
func writeCSV(w http.ResponseWriter, filename string, csvBytes []byte) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvBytes)
}
