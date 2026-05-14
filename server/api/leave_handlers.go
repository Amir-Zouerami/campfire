package api

import (
	"encoding/json"
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
handleValidateLeaveRequest handles leave request validation.
*/
func handleValidateLeaveRequest(
	log logger.Logger,
	mm mattermost.Client,
	leaveService *service.LeaveService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request ValidateLeaveRequestRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		result, err := leaveService.ValidateRequest(r.Context(), request.ToServiceInput(user.ID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteValidateLeaveRequest(w, http.StatusOK, LeaveValidationResultToResponse(*result))
	}
}
