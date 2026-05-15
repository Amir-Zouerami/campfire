package service

import (
	"context"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
WorkspaceMemberProvider defines a port for reading workspace member user IDs.
*/
type WorkspaceMemberProvider interface {
	ListWorkspaceMemberUserIDs(ctx context.Context, workspace domain.Workspace) ([]string, error)
}

/*
NoopWorkspaceMemberProvider returns no members.

It is useful for tests and non-Mattermost service execution.
*/
type NoopWorkspaceMemberProvider struct{}

/*
NewNoopWorkspaceMemberProvider creates a no-op workspace member provider.
*/
func NewNoopWorkspaceMemberProvider() *NoopWorkspaceMemberProvider {
	return &NoopWorkspaceMemberProvider{}
}

/*
ListWorkspaceMemberUserIDs returns no members.
*/
func (p *NoopWorkspaceMemberProvider) ListWorkspaceMemberUserIDs(
	_ context.Context,
	_ domain.Workspace,
) ([]string, error) {
	return []string{}, nil
}
