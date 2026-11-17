package api

import (
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
maxRequestBodyBytes caps JSON request bodies. Campfire's largest legitimate
payload is a standup submission; one megabyte leaves generous room while stopping
a client from making the plugin buffer arbitrarily large bodies.
*/
const maxRequestBodyBytes = 1 << 20

/*
limitRequestBody rejects request bodies larger than maxRequestBodyBytes.
*/
func limitRequestBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
		}

		next.ServeHTTP(w, r)
	})
}

/*
requireWorkspaceAccess guards every route addressed to one workspace or channel.

Capability checks (manage, approve, view reports) answer "what may this member
do". This middleware answers the earlier question, "may this user use this
workspace at all": they must belong to its Mattermost channel, hold an explicit
Campfire role in it, or be a system admin. Enforcing it in one place means a new
workspace route is protected without its author having to remember to.
*/
func requireWorkspaceAccess(
	log logger.Logger,
	mm mattermost.Client,
	permissionService *service.PermissionService,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			workspaceID, channelID := workspaceScopeFromPath(r.URL.Path)
			if workspaceID == "" && channelID == "" {
				next.ServeHTTP(w, r)
				return
			}

			user, ok := loadCurrentUser(w, r, log, mm)
			if !ok {
				return
			}

			permissionUser := permissionUserFromMattermost(user)

			var allowed bool
			var err error
			if channelID != "" {
				allowed, err = permissionService.CanAccessChannel(channelID, permissionUser)
			} else {
				allowed, err = permissionService.CanAccessWorkspace(r.Context(), workspaceID, permissionUser)
			}

			if err != nil {
				logServiceError(log, err)
				WriteServiceError(w, err)
				return
			}

			if !allowed {
				WriteError(w, http.StatusForbidden, "permission_denied", "You do not have access to this Campfire workspace.")
				return
			}

			next.ServeHTTP(w, withCurrentUser(r, user))
		})
	}
}

/*
workspaceScopeFromPath extracts the workspace ID, or the channel ID of a
by-channel lookup, from an API path. Both are empty for routes that are not
addressed to a single workspace.
*/
func workspaceScopeFromPath(path string) (workspaceID string, channelID string) {
	_, rest, found := strings.Cut(path, "/workspaces/")
	if !found {
		return "", ""
	}

	segments := strings.Split(rest, "/")
	first := strings.TrimSpace(segments[0])

	if first == "by-channel" {
		if len(segments) > 1 {
			return "", strings.TrimSpace(segments[1])
		}

		return "", ""
	}

	return first, ""
}

/*
requireWorkspaceMember applies the workspace access rule to routes that name
their workspace in the request body instead of the URL, which the path-based
middleware cannot see.
*/
func requireWorkspaceMember(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	allowed, err := permissionService.CanAccessWorkspace(r.Context(), workspaceID, permissionUserFromMattermost(user))
	if err != nil {
		logServiceError(log, err)
		WriteServiceError(w, err)
		return false
	}

	if !allowed {
		WriteError(w, http.StatusForbidden, "permission_denied", "You do not have access to this Campfire workspace.")
		return false
	}

	return true
}
