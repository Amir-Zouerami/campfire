package service

import (
	"context"
	"errors"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ListWorkspaceRolesInput contains the workspace role list request.
*/
type ListWorkspaceRolesInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
}

/*
WorkspaceRoleOverview summarizes workspace members and role assignments.
*/
type WorkspaceRoleOverview struct {
	WorkspaceID domain.ID

	Settings domain.WorkspaceRoleSettings

	MemberUserIDs   []string
	LeadUserIDs     []string
	ApproverUserIDs []string
	AdminUserIDs    []string
	ViewerUserIDs   []string
}

/*
WorkspaceRoleService builds the workspace role/settings view.
*/
type WorkspaceRoleService struct {
	workspaceStore          store.WorkspaceStore
	workspaceRoleStore      store.WorkspaceRoleStore
	workspaceMemberProvider WorkspaceMemberProvider
}

/*
NewWorkspaceRoleService creates a workspace role service.
*/
func NewWorkspaceRoleService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	workspaceMemberProvider WorkspaceMemberProvider,
) *WorkspaceRoleService {
	return &WorkspaceRoleService{
		workspaceStore:          workspaceStore,
		workspaceRoleStore:      workspaceRoleStore,
		workspaceMemberProvider: workspaceMemberProvider,
	}
}

/*
List returns role settings and role groups for one workspace.
*/
func (s *WorkspaceRoleService) List(
	ctx context.Context,
	input ListWorkspaceRolesInput,
) (*WorkspaceRoleOverview, error) {
	actorUserID := strings.TrimSpace(input.ActorUserID)
	if actorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view workspace roles.")
	}

	workspaceID := domain.ID(strings.TrimSpace(input.WorkspaceID))
	if workspaceID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireRoleViewPermission(ctx, actorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	settings, err := s.workspaceRoleStore.GetSettings(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace role settings were not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace role settings.")
	}

	leadUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspaceID, []domain.Role{domain.RoleLead})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Leads.")
	}

	approverUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspaceID, []domain.Role{domain.RoleApprover})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Approvers.")
	}

	adminUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspaceID, []domain.Role{domain.RoleAdmin})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Admins.")
	}

	viewerUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspaceID, []domain.Role{domain.RoleViewer})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Viewers.")
	}

	memberUserIDs, err := s.workspaceMemberProvider.ListWorkspaceMemberUserIDs(ctx, *workspace)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace channel members.")
	}

	return &WorkspaceRoleOverview{
		WorkspaceID:     workspace.ID,
		Settings:        *settings,
		MemberUserIDs:   normalizeUserIDs(memberUserIDs),
		LeadUserIDs:     normalizeUserIDs(leadUserIDs),
		ApproverUserIDs: normalizeUserIDs(approverUserIDs),
		AdminUserIDs:    normalizeUserIDs(adminUserIDs),
		ViewerUserIDs:   normalizeUserIDs(viewerUserIDs),
	}, nil
}

/*
requireRoleViewPermission ensures the actor can see workspace role settings.
*/
func (s *WorkspaceRoleService) requireRoleViewPermission(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID domain.ID,
) error {
	if isSystemAdmin {
		return nil
	}

	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspaceID,
		actorUserID,
		[]domain.Role{domain.RoleLead, domain.RoleApprover, domain.RoleViewer},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify workspace role permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Approvers, Viewers, and System Admins can view workspace role settings.")
	}

	return nil
}
