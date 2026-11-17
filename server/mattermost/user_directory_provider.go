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

Users are loaded with one batched Mattermost call instead of one call per user: a
team page asks for every member at once, and each plugin API call is a separate
round trip to the Mattermost server. Missing users are skipped so stale
historical IDs do not break dashboard pages, and profiles come back in the order
they were asked for.

Email addresses are only included when the Mattermost privacy setting allows
members to see each other's email.
*/
func (p *UserDirectoryProvider) GetUsersByIDs(
	ctx context.Context,
	userIDs []string,
) ([]service.UserProfile, error) {
	cleanUserIDs := make([]string, 0, len(userIDs))
	seen := make(map[string]struct{}, len(userIDs))

	for _, userID := range userIDs {
		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" {
			continue
		}

		if _, duplicate := seen[cleanUserID]; duplicate {
			continue
		}

		seen[cleanUserID] = struct{}{}
		cleanUserIDs = append(cleanUserIDs, cleanUserID)
	}

	if len(cleanUserIDs) == 0 {
		return []service.UserProfile{}, nil
	}

	if err := ctx.Err(); err != nil {
		return nil, err
	}

	users, appErr := p.api.GetUsersByIds(cleanUserIDs)
	if appErr != nil {
		return nil, appErr
	}

	showEmail := p.emailAddressesAreVisible()
	usersByID := make(map[string]service.UserProfile, len(users))

	for _, user := range users {
		if user == nil {
			continue
		}

		profile := service.UserProfile{
			ID:          user.Id,
			Username:    user.Username,
			DisplayName: user.GetDisplayName(modelDisplayNamePreference),
		}
		if showEmail {
			profile.Email = user.Email
		}

		usersByID[user.Id] = profile
	}

	profiles := make([]service.UserProfile, 0, len(usersByID))
	for _, userID := range cleanUserIDs {
		if profile, found := usersByID[userID]; found {
			profiles = append(profiles, profile)
		}
	}

	return profiles, nil
}

/*
emailAddressesAreVisible reports whether Mattermost is configured to show email
addresses to other members. When the setting cannot be read, emails stay hidden.
*/
func (p *UserDirectoryProvider) emailAddressesAreVisible() bool {
	config := p.api.GetConfig()
	if config == nil || config.PrivacySettings.ShowEmailAddress == nil {
		return false
	}

	return *config.PrivacySettings.ShowEmailAddress
}

const modelDisplayNamePreference = "full_name"
