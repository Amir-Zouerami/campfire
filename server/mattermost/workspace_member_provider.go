package mattermost

import (
	"context"
	"fmt"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/mattermost/mattermost/server/public/plugin"
)

const mattermostChannelMemberPageSize = 200

/*
WorkspaceMemberProvider reads workspace members from the Mattermost channel.
*/
type WorkspaceMemberProvider struct {
	api plugin.API
}

/*
NewWorkspaceMemberProvider creates a Mattermost-backed workspace member provider.
*/
func NewWorkspaceMemberProvider(api plugin.API) *WorkspaceMemberProvider {
	return &WorkspaceMemberProvider{
		api: api,
	}
}

/*
ListWorkspaceMemberUserIDs returns unique user IDs from the workspace's Mattermost channel.
*/
func (p *WorkspaceMemberProvider) ListWorkspaceMemberUserIDs(
	ctx context.Context,
	workspace domain.Workspace,
) ([]string, error) {
	if strings.TrimSpace(workspace.ChannelID) == "" {
		return []string{}, nil
	}

	userIDs := []string{}
	seen := map[string]bool{}

	for page := 0; ; page++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		members, appErr := p.api.GetChannelMembers(
			workspace.ChannelID,
			page,
			mattermostChannelMemberPageSize,
		)
		if appErr != nil {
			return nil, fmt.Errorf("list Mattermost channel members: %w", appErr)
		}

		if len(members) == 0 {
			break
		}

		for _, member := range members {
			cleanUserID := strings.TrimSpace(member.UserId)
			if cleanUserID == "" || seen[cleanUserID] {
				continue
			}

			seen[cleanUserID] = true
			userIDs = append(userIDs, cleanUserID)
		}

		if len(members) < mattermostChannelMemberPageSize {
			break
		}
	}

	return userIDs, nil
}
