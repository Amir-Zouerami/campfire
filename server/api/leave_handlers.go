package api

import (
	"encoding/json"
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
handleValidateLeave handles leave request pre-validation.
*/
func handleValidateLeave(
	log logger.Logger,
	mm mattermost.Client,
	leaveValidationService *service.LeaveValidationService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request ValidateLeaveRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		result, err := leaveValidationService.ValidateForCreate(r.Context(), request.ToServiceInput(user.ID))
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteValidateLeave(w, http.StatusOK, ValidateLeaveResponse{
			Valid:    result.Valid,
			Warnings: result.Warnings,
		})
	}
}
