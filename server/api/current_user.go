package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
)

/*
loadCurrentUser loads the current Mattermost user from the request.

Mattermost injects Mattermost-User-Id for authenticated plugin requests and
strips any client-supplied copy. If that header is unavailable, Campfire falls
back to the session ID that the plugin entry point copies from Mattermost's
verified plugin context (see attachMattermostSessionHeader). Nothing sent by the
browser itself — headers or cookies — is ever used to identify the user.
*/
func loadCurrentUser(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	mm mattermost.Client,
) (*mattermost.User, bool) {
	if user, ok := r.Context().Value(currentUserContextKey{}).(*mattermost.User); ok && user != nil {
		return user, true
	}

	userID := strings.TrimSpace(r.Header.Get("Mattermost-User-Id"))
	if userID != "" {
		return loadCurrentUserByID(w, log, mm, userID)
	}

	sessionID := sessionIDFromRequest(r)
	if sessionID == "" {
		log.Warn(
			"missing Mattermost authentication context",
			logger.String("has_mattermost_user_id", boolLabel(r.Header.Get("Mattermost-User-Id") != "")),
			logger.String("has_mattermost_session_id", boolLabel(r.Header.Get("Mattermost-Session-Id") != "")),
			logger.String("x_requested_with", r.Header.Get("X-Requested-With")),
		)
		WriteError(w, http.StatusUnauthorized, "not_authenticated", "You must be signed in to use Campfire.")
		return nil, false
	}

	user, err := mm.GetUserFromSessionID(sessionID)
	if err != nil {
		log.Warn("failed to load current user from verified Mattermost session")
		WriteError(w, http.StatusUnauthorized, "not_authenticated", "You must be signed in to use Campfire.")
		return nil, false
	}

	return user, true
}

/*
loadCurrentUserByID loads the current user from a Mattermost user ID.
*/
func loadCurrentUserByID(
	w http.ResponseWriter,
	log logger.Logger,
	mm mattermost.Client,
	userID string,
) (*mattermost.User, bool) {
	user, err := mm.GetUser(userID)
	if err != nil {
		log.Warn("failed to load current user", logger.String("user_id", userID))
		WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load the current user.")
		return nil, false
	}

	return user, true
}

/*
sessionIDFromRequest returns the verified Mattermost session ID.

The value is set by the plugin entry point from Mattermost's plugin context, which
only carries a session ID for requests Mattermost has already authenticated.
*/
func sessionIDFromRequest(r *http.Request) string {
	return strings.TrimSpace(r.Header.Get("Mattermost-Session-Id"))
}

/*
boolLabel returns a log-safe boolean label.
*/
func boolLabel(value bool) string {
	if value {
		return "true"
	}

	return "false"
}

/*
currentUserContextKey is the request-context key for the already loaded user.
*/
type currentUserContextKey struct{}

/*
withCurrentUser remembers the authenticated user on the request, so that the
access middleware and the handler share one Mattermost user lookup.
*/
func withCurrentUser(r *http.Request, user *mattermost.User) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), currentUserContextKey{}, user))
}
