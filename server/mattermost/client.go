package mattermost

import (
	"errors"
	"net/http"
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
	GetUserFromSessionID(sessionID string) (*User, error)
	GetChannelType(channelID string) (string, error)
	IsChannelAdmin(channelID string, userID string) (bool, error)
	IsChannelMember(channelID string, userID string) (bool, error)
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
GetUserFromSessionID resolves a Mattermost session ID to its user.

Callers must only pass a session ID that came from Mattermost's plugin context,
never a value supplied by the browser: a session ID identifies the user without
any further proof.
*/
func (c *PluginClient) GetUserFromSessionID(sessionID string) (*User, error) {
	cleanSessionID := strings.TrimSpace(sessionID)
	if cleanSessionID == "" {
		return nil, errors.New("session ID is required")
	}

	session, appErr := c.api.GetSession(cleanSessionID)
	if appErr != nil {
		return nil, appErr
	}

	if session == nil || strings.TrimSpace(session.UserId) == "" {
		return nil, errors.New("session has no user")
	}

	if session.IsExpired() {
		return nil, errors.New("session has expired")
	}

	return c.GetUser(session.UserId)
}

/*
GetChannelType returns the Mattermost channel type.

Mattermost uses:
  - O for public channels
  - P for private channels
  - G for group messages
  - D for direct messages

Campfire workspace setup must reject direct messages.
*/
func (c *PluginClient) GetChannelType(channelID string) (string, error) {
	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return "", errors.New("channel ID is required")
	}

	channel, appErr := c.api.GetChannel(cleanChannelID)
	if appErr != nil {
		return "", appErr
	}

	if channel == nil {
		return "", errors.New("channel was not found")
	}

	return strings.TrimSpace(string(channel.Type)), nil
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
IsChannelMember reports whether a Mattermost user belongs to a channel.

Campfire workspaces are bound to one channel, and channel membership is what makes
someone a workspace member. A missing membership is a normal "no", not an error.
*/
func (c *PluginClient) IsChannelMember(channelID string, userID string) (bool, error) {
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
		if appErr.StatusCode == http.StatusNotFound {
			return false, nil
		}

		return false, appErr
	}

	return member != nil, nil
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
