package api

import (
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
)

const mattermostAuthCookieName = "MMAUTHTOKEN"

/*
loadCurrentUser loads the current Mattermost user from the request.

Mattermost normally injects Mattermost-User-Id for authenticated plugin
requests. If that header is unavailable, Campfire falls back to verifying the
Mattermost session token cookie with the Mattermost plugin API instead of
trusting a client-supplied user ID.
*/
func loadCurrentUser(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	mm mattermost.Client,
) (*mattermost.User, bool) {
	userID := strings.TrimSpace(r.Header.Get("Mattermost-User-Id"))
	if userID != "" {
		return loadCurrentUserByID(w, log, mm, userID)
	}

	sessionToken := sessionTokenFromRequest(r)
	if sessionToken == "" {
		log.Warn(
			"missing Mattermost authentication context",
			logger.String("has_cookie", boolLabel(hasCookie(r, mattermostAuthCookieName))),
			logger.String("has_mattermost_user_id", boolLabel(r.Header.Get("Mattermost-User-Id") != "")),
			logger.String("has_mattermost_session_id", boolLabel(r.Header.Get("Mattermost-Session-Id") != "")),
			logger.String("x_requested_with", r.Header.Get("X-Requested-With")),
		)
		WriteError(w, http.StatusUnauthorized, "not_authenticated", "You must be signed in to use Campfire.")
		return nil, false
	}

	user, err := mm.GetUserFromSessionToken(sessionToken)
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
sessionTokenFromRequest returns the Mattermost browser session token.

The cookie path is the primary browser path. The Mattermost-Session-Id header is
also checked for local/plugin environments that forward a verified session value
through headers.
*/
func sessionTokenFromRequest(r *http.Request) string {
	headerValue := strings.TrimSpace(r.Header.Get("Mattermost-Session-Id"))
	if headerValue != "" {
		return headerValue
	}

	cookie, err := r.Cookie(mattermostAuthCookieName)
	if err != nil {
		return ""
	}

	return strings.TrimSpace(cookie.Value)
}

/*
hasCookie reports whether a request contains a named cookie.
*/
func hasCookie(r *http.Request, name string) bool {
	_, err := r.Cookie(name)

	return err == nil
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
