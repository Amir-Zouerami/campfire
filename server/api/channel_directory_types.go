package api

import "github.com/amir-zouerami/campfire/server/service"

/*
ChannelProfilePayload is the API representation of a Mattermost channel.
*/
type ChannelProfilePayload struct {
	ID          string `json:"id"`
	TeamID      string `json:"teamId"`
	TeamName    string `json:"teamName"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Type        string `json:"type"`
}

/*
LookupChannelsRequest is sent to POST /channels/lookup.
*/
type LookupChannelsRequest struct {
	ChannelIDs []string `json:"channelIds"`
}

/*
LookupChannelsResponse is returned by POST /channels/lookup.
*/
type LookupChannelsResponse struct {
	Channels []ChannelProfilePayload `json:"channels"`
}

/*
SearchChannelsResponse is returned by GET /channels/search.
*/
type SearchChannelsResponse struct {
	Channels []ChannelProfilePayload `json:"channels"`
}

/*
ChannelProfilesToPayload maps service channel profiles to API payloads.
*/
func ChannelProfilesToPayload(profiles []service.ChannelProfile) []ChannelProfilePayload {
	payloads := make([]ChannelProfilePayload, 0, len(profiles))

	for _, profile := range profiles {
		payloads = append(payloads, ChannelProfileToPayload(profile))
	}

	return payloads
}

/*
ChannelProfileToPayload maps one service channel profile to API payload.
*/
func ChannelProfileToPayload(profile service.ChannelProfile) ChannelProfilePayload {
	return ChannelProfilePayload{
		ID:          profile.ID,
		TeamID:      profile.TeamID,
		TeamName:    profile.TeamName,
		Name:        profile.Name,
		DisplayName: profile.DisplayName,
		Type:        profile.Type,
	}
}
