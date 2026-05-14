package store

import (
	"context"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
CreateWorkspaceParams contains all records needed to create a workspace.

Workspace creation is intentionally transactional at the store layer once SQL
is connected.
*/
type CreateWorkspaceParams struct {
	Workspace       domain.Workspace
	WorkingDays     []domain.WorkspaceWorkingDay
	RoleSettings    domain.WorkspaceRoleSettings
	RoleAssignments []domain.WorkspaceRoleAssignment
}

/*
WorkspaceStore defines persistence operations for workspace configuration.
*/
type WorkspaceStore interface {
	GetByChannelID(ctx context.Context, channelID string) (*domain.Workspace, error)
	Create(ctx context.Context, params CreateWorkspaceParams) (*domain.Workspace, error)
}

/*
UnavailableWorkspaceStore is a temporary store implementation used before the
runtime SQL connection strategy is selected.

It keeps the service and handler layers wired without pretending persistence
exists.
*/
type UnavailableWorkspaceStore struct{}

/*
NewUnavailableWorkspaceStore creates a workspace store that reports persistence
as unavailable.
*/
func NewUnavailableWorkspaceStore() *UnavailableWorkspaceStore {
	return &UnavailableWorkspaceStore{}
}

/*
GetByChannelID reports that persistence is not connected yet.
*/
func (s *UnavailableWorkspaceStore) GetByChannelID(_ context.Context, _ string) (*domain.Workspace, error) {
	return nil, ErrUnavailable
}

/*
Create reports that persistence is not connected yet.
*/
func (s *UnavailableWorkspaceStore) Create(_ context.Context, _ CreateWorkspaceParams) (*domain.Workspace, error) {
	return nil, ErrUnavailable
}
