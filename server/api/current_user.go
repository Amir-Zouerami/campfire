package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
)

/*
loadCurrentUser loads the current Mattermost user from request headers.

It writes the HTTP error response directly and returns false when the user cannot
be loaded.
*/
func loadCurrentUser(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	mm mattermost.Client,
) (*mattermost.User, bool) {
	userID := r.Header.Get("Mattermost-User-Id")
	if userID == "" {
		WriteError(w, http.StatusUnauthorized, "not_authenticated", "You must be signed in to use Campfire.")
		return nil, false
	}

	user, err := mm.GetUser(userID)
	if err != nil {
		log.Warn("failed to load current user", logger.String("user_id", userID))
		WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load the current user.")
		return nil, false
	}

	return user, true
}
