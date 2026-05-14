package mattermost

import (
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
	user, appErr := c.api.GetUser(userID)
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
hasRole returns true when the Mattermost role string contains the requested role.
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
