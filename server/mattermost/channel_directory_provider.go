package mattermost

import (
	"context"
	"strings"

	"github.com/amir-zouerami/campfire/server/service"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
ChannelDirectoryProvider resolves Mattermost channels for Campfire services.
*/
type ChannelDirectoryProvider struct {
	api plugin.API
}

/*
NewChannelDirectoryProvider creates a Mattermost-backed channel directory provider.
*/
func NewChannelDirectoryProvider(api plugin.API) *ChannelDirectoryProvider {
	return &ChannelDirectoryProvider{
		api: api,
	}
}

/*
LookupChannelsByIDs resolves channel IDs to readable channel profiles.

Missing or inaccessible channels are skipped so stale saved notification targets
never break the settings page.
*/
func (p *ChannelDirectoryProvider) LookupChannelsByIDs(
	ctx context.Context,
	actorUserID string,
	channelIDs []string,
) ([]service.ChannelProfile, error) {
	profiles := make([]service.ChannelProfile, 0, len(channelIDs))
	teamNames := map[string]string{}

	for _, channelID := range channelIDs {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		cleanChannelID := strings.TrimSpace(channelID)
		if cleanChannelID == "" {
			continue
		}

		channel, appErr := p.api.GetChannel(cleanChannelID)
		if appErr != nil || channel == nil || !p.canSee(actorUserID, channel) {
			continue
		}

		profiles = append(profiles, p.channelToProfile(ctx, channel, teamNames))
	}

	return profiles, nil
}

/*
SearchChannels returns channels from a Mattermost team matching the search term.
*/
func (p *ChannelDirectoryProvider) SearchChannels(
	ctx context.Context,
	actorUserID string,
	teamID string,
	term string,
	limit int,
) ([]service.ChannelProfile, error) {
	cleanTeamID := strings.TrimSpace(teamID)
	cleanTerm := strings.TrimSpace(term)
	if cleanTeamID == "" || cleanTerm == "" || !p.inTeam(actorUserID, cleanTeamID) {
		return []service.ChannelProfile{}, nil
	}

	channels, appErr := p.api.SearchChannels(cleanTeamID, cleanTerm)
	if appErr != nil {
		return nil, appErr
	}

	profiles := make([]service.ChannelProfile, 0, minInt(len(channels), limit))
	teamNames := map[string]string{}

	for _, channel := range channels {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		if channel == nil || strings.TrimSpace(channel.Id) == "" || !p.canSee(actorUserID, channel) {
			continue
		}

		profiles = append(profiles, p.channelToProfile(ctx, channel, teamNames))
		if len(profiles) >= limit {
			break
		}
	}

	return profiles, nil
}

/*
channelToProfile maps a Mattermost channel to a safe Campfire channel profile.
*/
func (p *ChannelDirectoryProvider) channelToProfile(
	ctx context.Context,
	channel *model.Channel,
	teamNames map[string]string,
) service.ChannelProfile {
	teamName := p.teamName(ctx, channel.TeamId, teamNames)

	return service.ChannelProfile{
		ID:          channel.Id,
		TeamID:      channel.TeamId,
		TeamName:    teamName,
		Name:        channel.Name,
		DisplayName: channel.DisplayName,
		Type:        string(channel.Type),
	}
}

/*
teamName returns the readable team name for a team ID, with per-request caching.
*/
func (p *ChannelDirectoryProvider) teamName(
	ctx context.Context,
	teamID string,
	teamNames map[string]string,
) string {
	cleanTeamID := strings.TrimSpace(teamID)
	if cleanTeamID == "" {
		return ""
	}

	if value, ok := teamNames[cleanTeamID]; ok {
		return value
	}

	select {
	case <-ctx.Done():
		return cleanTeamID
	default:
	}

	team, appErr := p.api.GetTeam(cleanTeamID)
	if appErr != nil || team == nil {
		teamNames[cleanTeamID] = cleanTeamID
		return cleanTeamID
	}

	label := strings.TrimSpace(team.DisplayName)
	if label == "" {
		label = strings.TrimSpace(team.Name)
	}
	if label == "" {
		label = cleanTeamID
	}

	teamNames[cleanTeamID] = label
	return label
}

/*
minInt returns the smaller integer.
*/
func minInt(first int, second int) int {
	if first < second {
		return first
	}

	return second
}

/*
canSee reports whether a user may learn about a channel: they belong to it, it is
public in one of their teams, or they are a system admin.
*/
func (p *ChannelDirectoryProvider) canSee(userID string, channel *model.Channel) bool {
	if p.api.HasPermissionTo(userID, model.PermissionManageSystem) {
		return true
	}

	if member, appErr := p.api.GetChannelMember(channel.Id, userID); appErr == nil && member != nil {
		return true
	}

	return channel.Type == model.ChannelTypeOpen && p.inTeam(userID, channel.TeamId)
}

/*
inTeam reports whether a user is a current member of a team, or a system admin.
*/
func (p *ChannelDirectoryProvider) inTeam(userID string, teamID string) bool {
	if p.api.HasPermissionTo(userID, model.PermissionManageSystem) {
		return true
	}

	member, appErr := p.api.GetTeamMember(teamID, userID)

	return appErr == nil && member != nil && member.DeleteAt == 0
}
