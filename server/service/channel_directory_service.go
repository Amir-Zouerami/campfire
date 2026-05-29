package service

import (
	"context"
	"strings"
)

/*
ChannelProfile is Campfire's safe read model for a Mattermost channel.
*/
type ChannelProfile struct {
	ID          string
	TeamID      string
	TeamName    string
	Name        string
	DisplayName string
	Type        string
}

/*
ChannelDirectoryProvider defines Mattermost channel lookup/search behavior.
*/
type ChannelDirectoryProvider interface {
	LookupChannelsByIDs(ctx context.Context, channelIDs []string) ([]ChannelProfile, error)
	SearchChannels(ctx context.Context, teamID string, term string, limit int) ([]ChannelProfile, error)
}

/*
LookupChannelsInput contains Mattermost channel IDs to resolve.
*/
type LookupChannelsInput struct {
	ActorUserID string
	ChannelIDs  []string
}

/*
SearchChannelsInput contains a team-scoped channel search request.
*/
type SearchChannelsInput struct {
	ActorUserID string
	TeamID      string
	Term        string
	Limit       int
}

/*
ChannelDirectoryService resolves readable Mattermost channel metadata.
*/
type ChannelDirectoryService struct {
	channelDirectoryProvider ChannelDirectoryProvider
}

/*
NewChannelDirectoryService creates a channel directory service.
*/
func NewChannelDirectoryService(channelDirectoryProvider ChannelDirectoryProvider) *ChannelDirectoryService {
	return &ChannelDirectoryService{
		channelDirectoryProvider: channelDirectoryProvider,
	}
}

/*
Lookup returns readable channel profiles for requested channel IDs.
*/
func (s *ChannelDirectoryService) Lookup(ctx context.Context, input LookupChannelsInput) ([]ChannelProfile, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to resolve channels.")
	}

	channelIDs := normalizeChannelIDs(input.ChannelIDs)
	if len(channelIDs) == 0 {
		return []ChannelProfile{}, nil
	}

	if len(channelIDs) > 50 {
		return nil, NewError(ErrorCodeValidationFailed, "Channel lookup supports at most 50 channels at a time.")
	}

	profiles, err := s.channelDirectoryProvider.LookupChannelsByIDs(ctx, channelIDs)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not resolve Mattermost channels.")
	}

	return profiles, nil
}

/*
Search returns readable channels matching a team-scoped search term.
*/
func (s *ChannelDirectoryService) Search(ctx context.Context, input SearchChannelsInput) ([]ChannelProfile, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to search channels.")
	}

	cleanTeamID := strings.TrimSpace(input.TeamID)
	if cleanTeamID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Team ID is required for channel search.")
	}

	cleanTerm := strings.TrimSpace(input.Term)
	if cleanTerm == "" {
		return []ChannelProfile{}, nil
	}

	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	profiles, err := s.channelDirectoryProvider.SearchChannels(ctx, cleanTeamID, cleanTerm, limit)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not search Mattermost channels.")
	}

	return profiles, nil
}

/*
normalizeChannelIDs trims, de-duplicates, and preserves channel ID order.
*/
func normalizeChannelIDs(channelIDs []string) []string {
	seen := map[string]bool{}
	normalized := make([]string, 0, len(channelIDs))

	for _, channelID := range channelIDs {
		cleanChannelID := strings.TrimSpace(channelID)
		if cleanChannelID == "" || seen[cleanChannelID] {
			continue
		}

		seen[cleanChannelID] = true
		normalized = append(normalized, cleanChannelID)
	}

	return normalized
}
