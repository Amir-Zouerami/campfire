package mattermost

import (
	"context"
	"net/http"
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

type channelAPI struct{ plugin.API }

var notFound = model.NewAppError("test", "not_found", nil, "", http.StatusNotFound)

func (channelAPI) GetChannel(id string) (*model.Channel, *model.AppError) {
	kind := model.ChannelTypePrivate
	if id == "public" {
		kind = model.ChannelTypeOpen
	}

	return &model.Channel{Id: id, TeamId: "team", Type: kind, Name: id}, nil
}

func (channelAPI) GetChannelMember(channelID string, userID string) (*model.ChannelMember, *model.AppError) {
	if channelID == "mine" && userID == "member" {
		return &model.ChannelMember{}, nil
	}

	return nil, notFound
}

func (channelAPI) GetTeamMember(_ string, userID string) (*model.TeamMember, *model.AppError) {
	if userID == "member" {
		return &model.TeamMember{}, nil
	}

	return nil, notFound
}

func (channelAPI) HasPermissionTo(string, *model.Permission) bool { return false }

func (channelAPI) GetTeam(id string) (*model.Team, *model.AppError) { return &model.Team{Id: id}, nil }

func (channelAPI) SearchChannels(string, string) ([]*model.Channel, *model.AppError) {
	return []*model.Channel{{Id: "public", TeamId: "team", Type: model.ChannelTypeOpen}}, nil
}

func TestChannelsAreOnlyResolvedForPeopleWhoCanSeeThem(t *testing.T) {
	provider := NewChannelDirectoryProvider(channelAPI{})
	ctx := context.Background()
	ids := []string{"mine", "public", "secret"}

	for userID, want := range map[string]int{"member": 2, "outsider": 0} {
		profiles, err := provider.LookupChannelsByIDs(ctx, userID, ids)
		if err != nil || len(profiles) != want {
			t.Errorf("lookup for %s returned %d channels (%v), want %d", userID, len(profiles), err, want)
		}
	}

	profiles, err := provider.SearchChannels(ctx, "outsider", "team", "pub", 5)
	if err != nil || len(profiles) != 0 {
		t.Errorf("search outside own team returned %d channels (%v)", len(profiles), err)
	}
}
