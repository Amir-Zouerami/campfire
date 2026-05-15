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
handleListReminderRules handles listing workspace reminder settings.
*/
func handleListReminderRules(
	log logger.Logger,
	mm mattermost.Client,
	reminderService *service.ReminderService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		rules, err := reminderService.List(r.Context(), service.ListReminderRulesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListReminderRules(w, http.StatusOK, ListReminderRulesResponse{
			ReminderRules: ReminderRulesToPayload(rules),
		})
	}
}

/*
handleUpdateReminderRule handles updating one workspace reminder rule.
*/
func handleUpdateReminderRule(
	log logger.Logger,
	mm mattermost.Client,
	reminderService *service.ReminderService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		reminderRuleID := strings.TrimSpace(chi.URLParam(r, "reminderRuleID"))

		var request UpdateReminderRuleRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		rule, err := reminderService.Update(
			r.Context(),
			request.ToServiceInput(user.ID, user.IsSystemAdmin, workspaceID, reminderRuleID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteUpdateReminderRule(w, http.StatusOK, UpdateReminderRuleResponse{
			ReminderRule: ReminderRuleToPayload(*rule),
		})
	}
}
