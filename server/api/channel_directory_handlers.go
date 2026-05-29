package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
handleLookupChannels handles resolving Mattermost channel IDs to readable labels.
*/
func handleLookupChannels(
	log logger.Logger,
	mm mattermost.Client,
	channelDirectoryService *service.ChannelDirectoryService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		var request LookupChannelsRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		channels, err := channelDirectoryService.Lookup(r.Context(), service.LookupChannelsInput{
			ActorUserID: user.ID,
			ChannelIDs:  request.ChannelIDs,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteLookupChannels(w, http.StatusOK, LookupChannelsResponse{
			Channels: ChannelProfilesToPayload(channels),
		})
	}
}

/*
handleSearchChannels handles team-scoped Mattermost channel search.
*/
func handleSearchChannels(
	log logger.Logger,
	mm mattermost.Client,
	channelDirectoryService *service.ChannelDirectoryService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		limit := 20
		if parsed, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && parsed > 0 {
			limit = parsed
		}

		channels, err := channelDirectoryService.Search(r.Context(), service.SearchChannelsInput{
			ActorUserID: user.ID,
			TeamID:      r.URL.Query().Get("teamId"),
			Term:        r.URL.Query().Get("term"),
			Limit:       limit,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteSearchChannels(w, http.StatusOK, SearchChannelsResponse{
			Channels: ChannelProfilesToPayload(channels),
		})
	}
}
