package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/go-chi/chi/v5"
)

/*
RouterConfig contains dependencies needed by the HTTP API layer.
*/
type RouterConfig struct {
	Logger     logger.Logger
	Mattermost mattermost.Client
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

		api.Get("/workspaces/by-channel/{channelID}", handleGetWorkspaceByChannel(config.Logger))
		api.Post("/workspaces", handleCreateWorkspace(config.Logger))
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

Mattermost injects the current user ID into plugin HTTP requests.
*/
func handleMe(log logger.Logger, mm mattermost.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("Mattermost-User-Id")
		if userID == "" {
			WriteError(w, http.StatusUnauthorized, "not_authenticated", "You must be signed in to use Campfire.")
			return
		}

		user, err := mm.GetUser(userID)
		if err != nil {
			log.Warn("failed to load current user", logger.String("user_id", userID))
			WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load the current user.")
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
