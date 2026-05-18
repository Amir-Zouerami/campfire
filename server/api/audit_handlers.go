package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
handleListAuditLog handles workspace audit-log listing.
*/
func handleListAuditLog(
	log logger.Logger,
	mm mattermost.Client,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		limit := parseAuditLimit(r.URL.Query().Get("limit"))

		entries, err := auditService.List(r.Context(), service.ListAuditLogInput{
			ActorUserID:   user.ID,
			IsSystemAdmin: user.IsSystemAdmin,
			WorkspaceID:   workspaceID,
			Limit:         limit,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListAuditLog(w, http.StatusOK, ListAuditLogResponse{
			Entries: AuditLogEntriesToPayload(entries),
		})
	}
}

/*
parseAuditLimit normalizes audit-log list limits.
*/
func parseAuditLimit(value string) int {
	limit, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return 50
	}

	if limit <= 0 {
		return 50
	}

	if limit > 200 {
		return 200
	}

	return limit
}
