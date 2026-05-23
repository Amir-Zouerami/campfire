package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
ChannelAdminChecker checks Mattermost channel-admin inheritance for roles.

The service depends on this small interface instead of the raw Mattermost plugin API.
*/
type ChannelAdminChecker interface {
	IsChannelAdmin(channelID string, userID string) (bool, error)
}

/*
ListWorkspaceRolesInput contains the workspace role list request.
*/
type ListWorkspaceRolesInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
}

/*
UpsertWorkspaceRoleInput contains a request to add a named workspace role.
*/
type UpsertWorkspaceRoleInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	UserID        string
	Role          string
}

/*
DeleteWorkspaceRoleInput contains a request to remove a named workspace role.
*/
type DeleteWorkspaceRoleInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	UserID        string
	Role          string
}

/*
DeleteWorkspaceRoleResult contains the result of a role removal.
*/
type DeleteWorkspaceRoleResult struct {
	Deleted bool
	Roles   WorkspaceRoleOverview
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
WorkspaceRoleService builds and mutates workspace role/settings views.
*/
type WorkspaceRoleService struct {
	workspaceStore          store.WorkspaceStore
	workspaceRoleStore      store.WorkspaceRoleStore
	workspaceMemberProvider WorkspaceMemberProvider
	channelAdminChecker     ChannelAdminChecker
}

/*
NewWorkspaceRoleService creates a workspace role service.
*/
func NewWorkspaceRoleService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	workspaceMemberProvider WorkspaceMemberProvider,
	channelAdminChecker ChannelAdminChecker,
) *WorkspaceRoleService {
	return &WorkspaceRoleService{
		workspaceStore:          workspaceStore,
		workspaceRoleStore:      workspaceRoleStore,
		workspaceMemberProvider: workspaceMemberProvider,
		channelAdminChecker:     channelAdminChecker,
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

	workspace, settings, err := s.loadWorkspaceAndRoleSettings(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireRoleViewPermission(ctx, actorUserID, input.IsSystemAdmin, *workspace, *settings); err != nil {
		return nil, err
	}

	return s.buildOverview(ctx, *workspace, *settings)
}

/*
Upsert adds a named workspace role and returns the refreshed role overview.
*/
func (s *WorkspaceRoleService) Upsert(
	ctx context.Context,
	input UpsertWorkspaceRoleInput,
) (*WorkspaceRoleOverview, error) {
	actorUserID, workspace, settings, targetUserID, role, err := s.validateMutationInput(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.UserID,
		input.Role,
	)
	if err != nil {
		return nil, err
	}

	if err := s.requireRoleMutationPermission(ctx, actorUserID, input.IsSystemAdmin, *workspace, *settings, role); err != nil {
		return nil, err
	}

	assignment := domain.WorkspaceRoleAssignment{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspace.ID,
		UserID:      targetUserID,
		Role:        role,
		CreatedBy:   actorUserID,
		CreatedAt:   time.Now().UTC(),
	}

	if _, err := s.workspaceRoleStore.UpsertRoleAssignment(ctx, assignment); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not assign workspace role.")
	}

	return s.buildOverview(ctx, *workspace, *settings)
}

/*
Delete removes a named workspace role and returns the refreshed role overview.
*/
func (s *WorkspaceRoleService) Delete(
	ctx context.Context,
	input DeleteWorkspaceRoleInput,
) (*DeleteWorkspaceRoleResult, error) {
	actorUserID, workspace, settings, targetUserID, role, err := s.validateMutationInput(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.UserID,
		input.Role,
	)
	if err != nil {
		return nil, err
	}

	if err := s.requireRoleMutationPermission(ctx, actorUserID, input.IsSystemAdmin, *workspace, *settings, role); err != nil {
		return nil, err
	}

	if err := s.requireSafeRoleRemoval(ctx, input.IsSystemAdmin, workspace.ID, targetUserID, role); err != nil {
		return nil, err
	}

	deleted, err := s.workspaceRoleStore.DeleteRoleAssignment(ctx, workspace.ID, targetUserID, role)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not remove workspace role.")
	}

	overview, err := s.buildOverview(ctx, *workspace, *settings)
	if err != nil {
		return nil, err
	}

	return &DeleteWorkspaceRoleResult{
		Deleted: deleted,
		Roles:   *overview,
	}, nil
}

/*
buildOverview builds the role overview payload from stores and Mattermost membership.
*/
func (s *WorkspaceRoleService) buildOverview(
	ctx context.Context,
	workspace domain.Workspace,
	settings domain.WorkspaceRoleSettings,
) (*WorkspaceRoleOverview, error) {
	leadUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspace.ID, []domain.Role{domain.RoleLead})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Leads.")
	}

	approverUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspace.ID, []domain.Role{domain.RoleApprover})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Approvers.")
	}

	adminUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspace.ID, []domain.Role{domain.RoleAdmin})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Admins.")
	}

	viewerUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(ctx, workspace.ID, []domain.Role{domain.RoleViewer})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace Viewers.")
	}

	memberUserIDs, err := s.workspaceMemberProvider.ListWorkspaceMemberUserIDs(ctx, workspace)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace channel members.")
	}

	return &WorkspaceRoleOverview{
		WorkspaceID:     workspace.ID,
		Settings:        settings,
		MemberUserIDs:   normalizeUserIDs(memberUserIDs),
		LeadUserIDs:     normalizeUserIDs(leadUserIDs),
		ApproverUserIDs: normalizeUserIDs(approverUserIDs),
		AdminUserIDs:    normalizeUserIDs(adminUserIDs),
		ViewerUserIDs:   normalizeUserIDs(viewerUserIDs),
	}, nil
}

/*
validateMutationInput validates shared role mutation fields.
*/
func (s *WorkspaceRoleService) validateMutationInput(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID string,
	userID string,
	roleValue string,
) (string, *domain.Workspace, *domain.WorkspaceRoleSettings, string, domain.Role, error) {
	cleanActorUserID := strings.TrimSpace(actorUserID)
	if cleanActorUserID == "" {
		return "", nil, nil, "", "", NewError(ErrorCodePermissionDenied, "You must be signed in to manage workspace roles.")
	}

	workspace, settings, err := s.loadWorkspaceAndRoleSettings(ctx, workspaceID)
	if err != nil {
		return "", nil, nil, "", "", err
	}

	targetUserID := strings.TrimSpace(userID)
	if targetUserID == "" {
		return "", nil, nil, "", "", NewError(ErrorCodeValidationFailed, "User ID is required.")
	}

	role := domain.Role(strings.TrimSpace(roleValue))
	if !role.IsValid() {
		return "", nil, nil, "", "", NewError(ErrorCodeValidationFailed, "Role is not valid.")
	}

	if role == domain.RoleMember {
		return "", nil, nil, "", "", NewError(ErrorCodeValidationFailed, "Member access comes from channel membership and cannot be assigned manually.")
	}

	if role == domain.RoleAdmin && !isSystemAdmin {
		return "", nil, nil, "", "", NewError(ErrorCodePermissionDenied, "Only Mattermost system admins can assign or remove explicit Campfire Admin roles.")
	}

	return cleanActorUserID, workspace, settings, targetUserID, role, nil
}

/*
loadWorkspaceAndRoleSettings loads the active workspace and role behavior settings.
*/
func (s *WorkspaceRoleService) loadWorkspaceAndRoleSettings(
	ctx context.Context,
	workspaceID string,
) (*domain.Workspace, *domain.WorkspaceRoleSettings, error) {
	cleanWorkspaceID := domain.ID(strings.TrimSpace(workspaceID))
	if cleanWorkspaceID.String() == "" {
		return nil, nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, cleanWorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	settings, err := s.workspaceRoleStore.GetSettings(ctx, cleanWorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, nil, NewError(ErrorCodeNotFound, "Workspace role settings were not found.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not load workspace role settings.")
	}

	return workspace, settings, nil
}

/*
requireRoleViewPermission ensures the actor can see workspace role settings.
*/
func (s *WorkspaceRoleService) requireRoleViewPermission(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspace domain.Workspace,
	settings domain.WorkspaceRoleSettings,
) error {
	if isSystemAdmin {
		return nil
	}

	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspace.ID,
		actorUserID,
		[]domain.Role{domain.RoleLead, domain.RoleApprover, domain.RoleViewer, domain.RoleAdmin},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify workspace role permission.")
	}

	if hasRole {
		return nil
	}

	if settings.ChannelAdminsAreLeads && s.channelAdminChecker != nil {
		isChannelAdmin, err := s.channelAdminChecker.IsChannelAdmin(workspace.ChannelID, actorUserID)
		if err != nil {
			return NewError(ErrorCodeInternal, "Could not verify Mattermost channel admin access.")
		}

		if isChannelAdmin {
			return nil
		}
	}

	return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Approvers, Viewers, and System Admins can view workspace role settings.")
}

/*
requireRoleMutationPermission ensures the actor can add or remove named roles.
*/
func (s *WorkspaceRoleService) requireRoleMutationPermission(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspace domain.Workspace,
	settings domain.WorkspaceRoleSettings,
	role domain.Role,
) error {
	if isSystemAdmin {
		return nil
	}

	if role == domain.RoleAdmin {
		return NewError(ErrorCodePermissionDenied, "Only Mattermost system admins can manage explicit Campfire Admin roles.")
	}

	hasManagerRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspace.ID,
		actorUserID,
		[]domain.Role{domain.RoleLead, domain.RoleAdmin},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify workspace management permission.")
	}

	if hasManagerRole {
		return nil
	}

	if settings.ChannelAdminsAreLeads && s.channelAdminChecker != nil {
		isChannelAdmin, err := s.channelAdminChecker.IsChannelAdmin(workspace.ChannelID, actorUserID)
		if err != nil {
			return NewError(ErrorCodeInternal, "Could not verify Mattermost channel admin access.")
		}

		if isChannelAdmin {
			return nil
		}
	}

	return NewError(ErrorCodePermissionDenied, "Only workspace Leads and System Admins can manage role assignments.")
}

/*
requireSafeRoleRemoval prevents non-system users from orphaning workspace management.
*/
func (s *WorkspaceRoleService) requireSafeRoleRemoval(
	ctx context.Context,
	isSystemAdmin bool,
	workspaceID domain.ID,
	targetUserID string,
	role domain.Role,
) error {
	if isSystemAdmin {
		return nil
	}

	if role != domain.RoleLead && role != domain.RoleAdmin {
		return nil
	}

	targetHasRole, err := s.workspaceRoleStore.UserHasAnyRole(ctx, workspaceID, targetUserID, []domain.Role{role})
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify target role assignment.")
	}

	if !targetHasRole {
		return nil
	}

	managerCount, err := s.workspaceRoleStore.CountUserIDsByRoles(
		ctx,
		workspaceID,
		[]domain.Role{domain.RoleLead, domain.RoleAdmin},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify workspace manager count.")
	}

	if managerCount <= 1 {
		return NewError(ErrorCodeConflict, "Cannot remove the last named Lead/Admin from this workspace.")
	}

	return nil
}
