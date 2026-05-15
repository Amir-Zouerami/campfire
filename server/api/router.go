package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
RouterConfig contains dependencies needed by the HTTP API layer.
*/
type RouterConfig struct {
	Logger                 logger.Logger
	Mattermost             mattermost.Client
	WorkspaceService       *service.WorkspaceService
	GlobalSkipDateService  *service.GlobalSkipDateService
	LeaveValidationService *service.LeaveValidationService
	LeaveService           *service.LeaveService
	StandupRuntimeService  *service.StandupRuntimeService
	StandupService         *service.StandupService
}

/*
NewRouter builds the Campfire HTTP API router.

Route handlers should parse requests and delegate business logic to services.
They should not contain domain rules.
*/
func NewRouter(config RouterConfig) http.Handler {
	router := chi.NewRouter()

	router.Route("/api/v1", func(api chi.Router) {
		api.Get("/health", handleHealth(config.Logger))
		api.Get("/me", handleMe(config.Logger, config.Mattermost))

		api.Get(
			"/workspaces/by-channel/{channelID}",
			handleGetWorkspaceByChannel(config.Logger, config.WorkspaceService),
		)
		api.Post("/workspaces", handleCreateWorkspace(config.Logger, config.WorkspaceService))

		api.Get(
			"/workspaces/{workspaceID}/standups/configuration",
			handleListStandupConfiguration(config.Logger, config.Mattermost, config.StandupService),
		)
		api.Get(
			"/workspaces/{workspaceID}/standup-runtime/day",
			handleEvaluateStandupDay(config.Logger, config.Mattermost, config.StandupRuntimeService),
		)

		api.Get(
			"/workspaces/{workspaceID}/leave-types",
			handleListLeaveTypes(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/pending",
			handleListPendingLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/my-pending",
			handleListMyPendingLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Get(
			"/workspaces/{workspaceID}/leaves/approved",
			handleListApprovedLeaveRequests(config.Logger, config.Mattermost, config.LeaveService),
		)

		api.Get(
			"/settings/global/skip-dates",
			handleListGlobalSkipDates(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)
		api.Post(
			"/settings/global/skip-dates",
			handleCreateGlobalSkipDate(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)
		api.Delete(
			"/settings/global/skip-dates/{skipDateID}",
			handleDeleteGlobalSkipDate(config.Logger, config.Mattermost, config.GlobalSkipDateService),
		)

		api.Post(
			"/leaves/validate",
			handleValidateLeave(config.Logger, config.Mattermost, config.LeaveValidationService),
		)
		api.Post(
			"/leaves",
			handleCreateLeave(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Post(
			"/leaves/{leaveRequestID}/decision",
			handleDecideLeave(config.Logger, config.Mattermost, config.LeaveService),
		)
		api.Post(
			"/leaves/{leaveRequestID}/cancel",
			handleCancelLeave(config.Logger, config.Mattermost, config.LeaveService),
		)
	})

	return router
}

/*
handleHealth returns basic plugin health information.

This endpoint proves that the Mattermost server plugin and HTTP router are
wired correctly before deeper Campfire features are added.
*/
func handleHealth(log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Debug("health check requested", logger.String("path", r.URL.Path))

		WriteHealth(w, http.StatusOK, HealthResponse{
			Status:  "ok",
			Product: "Campfire",
			Version: "0.1.0",
		})
	}
}

/*
handleMe returns the currently authenticated Mattermost user.
*/
func handleMe(log logger.Logger, mm mattermost.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		WriteMe(w, http.StatusOK, MeResponse{
			User: MeUserResponse{
				ID:          user.ID,
				Username:    user.Username,
				DisplayName: user.DisplayName,
				Email:       user.Email,
			},
			IsSystemAdmin: user.IsSystemAdmin,
		})
	}
}
