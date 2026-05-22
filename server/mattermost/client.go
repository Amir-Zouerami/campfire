package mattermost

import (
	"errors"
	"strings"

	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
User is Campfire's minimal Mattermost user projection.

The app layer should depend on this small type instead of exposing the full
Mattermost model.User everywhere.
*/
type User struct {
	ID            string
	Username      string
	DisplayName   string
	Email         string
	IsSystemAdmin bool
}

/*
Client defines the Mattermost operations Campfire needs.

This boundary prevents services and handlers from directly depending on the
raw Mattermost plugin API.
*/
type Client interface {
	GetUser(userID string) (*User, error)
	GetUserFromSessionToken(sessionToken string) (*User, error)
	IsChannelAdmin(channelID string, userID string) (bool, error)
}

/*
PluginClient adapts the Mattermost plugin API to Campfire's Mattermost client interface.
*/
type PluginClient struct {
	api plugin.API
}

/*
NewPluginClient creates a Mattermost client backed by the plugin API.
*/
func NewPluginClient(api plugin.API) *PluginClient {
	return &PluginClient{
		api: api,
	}
}

/*
GetUser loads a Mattermost user and maps it to Campfire's user projection.
*/
func (c *PluginClient) GetUser(userID string) (*User, error) {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return nil, errors.New("user ID is required")
	}

	user, appErr := c.api.GetUser(cleanUserID)
	if appErr != nil {
		return nil, appErr
	}

	return &User{
		ID:            user.Id,
		Username:      user.Username,
		DisplayName:   user.GetDisplayName(displayNamePreferenceFullName),
		Email:         user.Email,
		IsSystemAdmin: hasRole(user.Roles, "system_admin"),
	}, nil
}

/*
GetUserFromSessionToken resolves a verified Mattermost session token to a user.

This is a safe fallback for plugin HTTP requests where Mattermost did not inject
the Mattermost-User-Id header but the browser still sent the Mattermost session
cookie.
*/
func (c *PluginClient) GetUserFromSessionToken(sessionToken string) (*User, error) {
	cleanSessionToken := strings.TrimSpace(sessionToken)
	if cleanSessionToken == "" {
		return nil, errors.New("session token is required")
	}

	session, appErr := c.api.GetSession(cleanSessionToken)
	if appErr != nil {
		return nil, appErr
	}

	if session == nil || strings.TrimSpace(session.UserId) == "" {
		return nil, errors.New("session has no user")
	}

	return c.GetUser(session.UserId)
}

/*
IsChannelAdmin reports whether a Mattermost user is an admin of a channel.

Mattermost stores channel membership roles on the channel member record. Campfire
uses this as the bridge for the "channel admins are Leads" workspace setting.
*/
func (c *PluginClient) IsChannelAdmin(channelID string, userID string) (bool, error) {
	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return false, errors.New("channel ID is required")
	}

	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return false, errors.New("user ID is required")
	}

	member, appErr := c.api.GetChannelMember(cleanChannelID, cleanUserID)
	if appErr != nil {
		return false, appErr
	}

	if member == nil {
		return false, nil
	}

	return hasRole(member.Roles, "channel_admin"), nil
}

/*
hasRole returns true when a Mattermost role string contains the requested role.
*/
func hasRole(roles string, role string) bool {
	for _, existingRole := range strings.Fields(roles) {
		if existingRole == role {
			return true
		}
	}

	return false
}

const displayNamePreferenceFullName = "full_name"
