package mattermost

import (
	"context"
	"strings"

	"github.com/amir-zouerami/campfire/server/service"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
UserDirectoryProvider resolves Mattermost users for Campfire services.
*/
type UserDirectoryProvider struct {
	api plugin.API
}

/*
NewUserDirectoryProvider creates a Mattermost-backed user directory provider.
*/
func NewUserDirectoryProvider(api plugin.API) *UserDirectoryProvider {
	return &UserDirectoryProvider{
		api: api,
	}
}

/*
GetUsersByIDs resolves user IDs to safe Campfire user profiles.

Missing users are skipped so stale historical IDs do not break dashboard pages.
*/
func (p *UserDirectoryProvider) GetUsersByIDs(
	ctx context.Context,
	userIDs []string,
) ([]service.UserProfile, error) {
	profiles := make([]service.UserProfile, 0, len(userIDs))

	for _, userID := range userIDs {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" {
			continue
		}

		user, appErr := p.api.GetUser(cleanUserID)
		if appErr != nil {
			continue
		}

		if user == nil {
			continue
		}

		profiles = append(profiles, service.UserProfile{
			ID:          user.Id,
			Username:    user.Username,
			DisplayName: user.GetDisplayName(modelDisplayNamePreference),
			Email:       user.Email,
		})
	}

	return profiles, nil
}

const modelDisplayNamePreference = "full_name"
