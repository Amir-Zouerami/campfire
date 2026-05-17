package service

import (
	"context"
	"strings"
)

/*
UserProfile is Campfire's safe read model for a Mattermost user.
*/
type UserProfile struct {
	ID          string
	Username    string
	DisplayName string
	Email       string
}

/*
UserDirectoryProvider defines user profile lookup behavior.

Mattermost-specific lookup logic lives in server/mattermost.
*/
type UserDirectoryProvider interface {
	GetUsersByIDs(ctx context.Context, userIDs []string) ([]UserProfile, error)
}

/*
LookupUsersInput contains user IDs to resolve.
*/
type LookupUsersInput struct {
	ActorUserID string
	UserIDs     []string
}

/*
UserDirectoryService resolves Mattermost user IDs to display profiles.
*/
type UserDirectoryService struct {
	userDirectoryProvider UserDirectoryProvider
}

/*
NewUserDirectoryService creates a user directory service.
*/
func NewUserDirectoryService(userDirectoryProvider UserDirectoryProvider) *UserDirectoryService {
	return &UserDirectoryService{
		userDirectoryProvider: userDirectoryProvider,
	}
}

/*
Lookup returns safe user profiles for requested user IDs.
*/
func (s *UserDirectoryService) Lookup(ctx context.Context, input LookupUsersInput) ([]UserProfile, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to resolve users.")
	}

	userIDs := normalizeUserIDs(input.UserIDs)
	if len(userIDs) == 0 {
		return []UserProfile{}, nil
	}

	if len(userIDs) > 200 {
		return nil, NewError(ErrorCodeValidationFailed, "User lookup supports at most 200 users at a time.")
	}

	profiles, err := s.userDirectoryProvider.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not resolve Mattermost users.")
	}

	return profiles, nil
}

/*
normalizeUserIDs trims, de-duplicates, and preserves user ID order.
*/
func normalizeUserIDs(userIDs []string) []string {
	seen := map[string]bool{}
	normalized := make([]string, 0, len(userIDs))

	for _, userID := range userIDs {
		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" || seen[cleanUserID] {
			continue
		}

		seen[cleanUserID] = true
		normalized = append(normalized, cleanUserID)
	}

	return normalized
}
