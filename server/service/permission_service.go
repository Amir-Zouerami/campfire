package service

import (
	"context"
	"errors"
	"slices"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
PermissionUser is the authenticated user shape needed by PermissionService.

The service package must not import the Mattermost boundary package, because
that creates an import cycle. API handlers map Mattermost users into this small
service-local shape.
*/
type PermissionUser struct {
	ID            string
	IsSystemAdmin bool
}

/*
AccessSource identifies why a user has access to a workspace ability.
*/
type AccessSource string

const (
	/*
		AccessSourceSystemAdmin means access comes from Mattermost system admin status.
	*/
	AccessSourceSystemAdmin AccessSource = "system_admin"

	/*
		AccessSourceChannelAdminRule means access comes from channel_admins_are_leads.
	*/
	AccessSourceChannelAdminRule AccessSource = "channel_admin_rule"

	/*
		AccessSourceExplicitAdmin means access comes from a named Campfire Admin role.
	*/
	AccessSourceExplicitAdmin AccessSource = "explicit_admin"

	/*
		AccessSourceExplicitLead means access comes from a named Campfire Lead role.
	*/
	AccessSourceExplicitLead AccessSource = "explicit_lead"

	/*
		AccessSourceExplicitApprover means access comes from a named Campfire Approver role.
	*/
	AccessSourceExplicitApprover AccessSource = "explicit_approver"

	/*
		AccessSourceExplicitViewer means access comes from a named Campfire Viewer role.
	*/
	AccessSourceExplicitViewer AccessSource = "explicit_viewer"

	/*
		AccessSourceExplicitExcluded means standup participation was disabled by a named exclusion.
	*/
	AccessSourceExplicitExcluded AccessSource = "explicit_excluded"

	/*
		AccessSourceMember means access comes from being an authenticated workspace participant.
	*/
	AccessSourceMember AccessSource = "member"
)

/*
EffectiveWorkspaceAccess describes the current user's effective workspace access.

The frontend currently consumes the capability booleans. The sources and role
label are kept in the service layer so the API can expose them later without
rewriting permission rules again.
*/
type EffectiveWorkspaceAccess struct {
	UserID         string
	RoleLabel      string
	IsSystemAdmin  bool
	IsChannelAdmin bool
	Roles          []domain.Role
	Sources        []AccessSource
	Capabilities   WorkspaceCapabilities
}

/*
PermissionService centralizes Campfire workspace access checks.

Handlers may use it for authentication-context decisions, and services can use
it as endpoint-by-endpoint permission enforcement is consolidated.
*/
type PermissionService struct {
	workspaceStore      store.WorkspaceStore
	workspaceRoleStore  store.WorkspaceRoleStore
	channelAdminChecker ChannelMembershipChecker
}

/*
NewPermissionService creates a centralized permission service.
*/
func NewPermissionService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	channelAdminChecker ChannelMembershipChecker,
) *PermissionService {
	return &PermissionService{
		workspaceStore:      workspaceStore,
		workspaceRoleStore:  workspaceRoleStore,
		channelAdminChecker: channelAdminChecker,
	}
}

/*
CanCreateWorkspace returns whether a user may configure Campfire for a channel.

Only Mattermost system admins and Mattermost channel admins may create a
workspace setup for a channel.
*/
func (s *PermissionService) CanCreateWorkspace(
	ctx context.Context,
	channelID string,
	user PermissionUser,
) (bool, error) {
	_ = ctx

	if strings.TrimSpace(user.ID) == "" {
		return false, NewError(ErrorCodePermissionDenied, "You must be signed in to create a Campfire workspace.")
	}

	if user.IsSystemAdmin {
		return true, nil
	}

	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return false, NewError(ErrorCodeValidationFailed, "Channel ID is required.")
	}

	isChannelAdmin, err := s.safeIsChannelAdmin(cleanChannelID, user.ID)
	if err != nil {
		return false, nil
	}

	return isChannelAdmin, nil
}

/*
GetWorkspaceAccess returns the current user's effective access for a workspace.
*/
func (s *PermissionService) GetWorkspaceAccess(
	ctx context.Context,
	workspace domain.Workspace,
	user PermissionUser,
) (*EffectiveWorkspaceAccess, error) {
	cleanUserID := strings.TrimSpace(user.ID)
	if cleanUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to use Campfire.")
	}

	settings, err := s.workspaceRoleStore.GetSettings(ctx, workspace.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace role settings were not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace role settings.")
	}

	explicitRoles, err := s.workspaceRoleStore.ListRolesForUser(ctx, workspace.ID, cleanUserID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not verify workspace role access.")
	}

	hasExplicitAdmin := slices.Contains(explicitRoles, domain.RoleAdmin)
	hasExplicitLead := slices.Contains(explicitRoles, domain.RoleLead)
	hasExplicitApprover := slices.Contains(explicitRoles, domain.RoleApprover)
	hasExplicitViewer := slices.Contains(explicitRoles, domain.RoleViewer)
	hasExplicitExcluded := slices.Contains(explicitRoles, domain.RoleExcluded)

	isChannelAdmin := false
	if settings.ChannelAdminsAreLeads {
		channelAdmin, err := s.safeIsChannelAdmin(workspace.ChannelID, cleanUserID)
		if err == nil {
			isChannelAdmin = channelAdmin
		}
	}

	systemAdminApplies := user.IsSystemAdmin && settings.SystemAdminsAreAdmins

	roles := buildEffectiveRoles(
		systemAdminApplies,
		isChannelAdmin,
		hasExplicitAdmin,
		hasExplicitLead,
		hasExplicitApprover,
		hasExplicitViewer,
		hasExplicitExcluded,
	)
	sources := buildEffectiveSources(
		systemAdminApplies,
		isChannelAdmin,
		hasExplicitAdmin,
		hasExplicitLead,
		hasExplicitApprover,
		hasExplicitViewer,
		hasExplicitExcluded,
	)

	capabilities := capabilitiesFromEffectiveRoles(
		systemAdminApplies,
		isChannelAdmin,
		hasExplicitAdmin,
		hasExplicitLead,
		hasExplicitApprover,
		hasExplicitViewer,
		hasExplicitExcluded,
	)

	return &EffectiveWorkspaceAccess{
		UserID:         cleanUserID,
		RoleLabel:      roleLabelFromCapabilities(capabilities),
		IsSystemAdmin:  systemAdminApplies,
		IsChannelAdmin: isChannelAdmin,
		Roles:          roles,
		Sources:        sources,
		Capabilities:   capabilities,
	}, nil
}

/*
CanManageWorkspace returns whether the user can manage workspace configuration.
*/
func (s *PermissionService) CanManageWorkspace(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	access, err := s.accessByWorkspaceID(ctx, workspaceID, user)
	if err != nil {
		return false, err
	}

	return access.Capabilities.CanManageWorkspace, nil
}

/*
CanManageStandups returns whether the user can manage standup forms and schedules.
*/
func (s *PermissionService) CanManageStandups(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	access, err := s.accessByWorkspaceID(ctx, workspaceID, user)
	if err != nil {
		return false, err
	}

	return access.Capabilities.CanManageStandups, nil
}

/*
CanViewWorkspaceReports returns whether the user can view workspace reports.
*/
func (s *PermissionService) CanViewWorkspaceReports(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	access, err := s.accessByWorkspaceID(ctx, workspaceID, user)
	if err != nil {
		return false, err
	}

	return access.Capabilities.CanViewWorkspaceReports, nil
}

/*
CanExportReports returns whether the user can post or export workspace reports.
*/
func (s *PermissionService) CanExportReports(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	access, err := s.accessByWorkspaceID(ctx, workspaceID, user)
	if err != nil {
		return false, err
	}

	return access.Capabilities.CanExportReports, nil
}

/*
CanApproveLeaves returns whether the user can approve workspace leave requests.
*/
func (s *PermissionService) CanApproveLeaves(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	access, err := s.accessByWorkspaceID(ctx, workspaceID, user)
	if err != nil {
		return false, err
	}

	return access.Capabilities.CanApproveLeaves, nil
}

/*
CanViewGlobalReports returns whether the user can view global Campfire reports.
*/
func (s *PermissionService) CanViewGlobalReports(
	ctx context.Context,
	user PermissionUser,
) (bool, error) {
	_ = ctx

	if strings.TrimSpace(user.ID) == "" {
		return false, NewError(ErrorCodePermissionDenied, "You must be signed in to view global reports.")
	}

	return user.IsSystemAdmin, nil
}

/*
accessByWorkspaceID loads a workspace and returns effective access.
*/
func (s *PermissionService) accessByWorkspaceID(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (*EffectiveWorkspaceAccess, error) {
	cleanWorkspaceID := domain.ID(strings.TrimSpace(workspaceID))
	if cleanWorkspaceID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, cleanWorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	return s.GetWorkspaceAccess(ctx, *workspace, user)
}

/*
CanAccessWorkspace reports whether a user may use a workspace at all.

Every workspace API call passes through this check before any capability check.
A user may use a workspace when they are a member of its Mattermost channel, hold
an explicit Campfire role in it, or are a Mattermost system admin. Without it,
any signed-in Mattermost user who learned a workspace ID could read the member
list, approved leave and standup configuration of a private channel.

A workspace that does not exist is reported as accessible so the handler can
answer with its own "not found" error.
*/
func (s *PermissionService) CanAccessWorkspace(
	ctx context.Context,
	workspaceID string,
	user PermissionUser,
) (bool, error) {
	cleanUserID := strings.TrimSpace(user.ID)
	if cleanUserID == "" {
		return false, nil
	}

	if user.IsSystemAdmin {
		return true, nil
	}

	cleanWorkspaceID := domain.ID(strings.TrimSpace(workspaceID))
	if cleanWorkspaceID.String() == "" {
		return true, nil
	}

	workspace, err := s.workspaceStore.GetByID(ctx, cleanWorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return true, nil
		}

		return false, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	isMember, err := s.CanAccessChannel(workspace.ChannelID, user)
	if err != nil {
		return false, err
	}

	if isMember {
		return true, nil
	}

	explicitRoles, err := s.workspaceRoleStore.ListRolesForUser(ctx, workspace.ID, cleanUserID)
	if err != nil {
		return false, NewError(ErrorCodeInternal, "Could not verify workspace role access.")
	}

	for _, role := range explicitRoles {
		if role != domain.RoleExcluded {
			return true, nil
		}
	}

	return false, nil
}

/*
CanAccessChannel reports whether a user may see Campfire data bound to a channel:
they are a member of the channel or a Mattermost system admin.
*/
func (s *PermissionService) CanAccessChannel(channelID string, user PermissionUser) (bool, error) {
	cleanUserID := strings.TrimSpace(user.ID)
	if cleanUserID == "" {
		return false, nil
	}

	if user.IsSystemAdmin {
		return true, nil
	}

	if s.channelAdminChecker == nil {
		return false, nil
	}

	isMember, err := s.channelAdminChecker.IsChannelMember(channelID, cleanUserID)
	if err != nil {
		return false, NewError(ErrorCodeInternal, "Could not verify channel membership.")
	}

	return isMember, nil
}

/*
safeIsChannelAdmin checks channel-admin status without granting access on lookup failure.
*/
func (s *PermissionService) safeIsChannelAdmin(channelID string, userID string) (bool, error) {
	if s.channelAdminChecker == nil {
		return false, nil
	}

	isChannelAdmin, err := s.channelAdminChecker.IsChannelAdmin(channelID, userID)
	if err != nil {
		return false, err
	}

	return isChannelAdmin, nil
}

/*
buildEffectiveRoles returns the user's effective role list.
*/
func buildEffectiveRoles(
	isSystemAdmin bool,
	isChannelAdminLead bool,
	hasExplicitAdmin bool,
	hasExplicitLead bool,
	hasExplicitApprover bool,
	hasExplicitViewer bool,
	hasExplicitExcluded bool,
) []domain.Role {
	roles := []domain.Role{domain.RoleMember}

	if isSystemAdmin || hasExplicitAdmin {
		roles = append(roles, domain.RoleAdmin)
	}

	if isChannelAdminLead || hasExplicitLead {
		roles = append(roles, domain.RoleLead)
	}

	if hasExplicitApprover {
		roles = append(roles, domain.RoleApprover)
	}

	if hasExplicitViewer {
		roles = append(roles, domain.RoleViewer)
	}

	if hasExplicitExcluded {
		roles = append(roles, domain.RoleExcluded)
	}

	return roles
}

/*
buildEffectiveSources returns the user's effective access sources.
*/
func buildEffectiveSources(
	isSystemAdmin bool,
	isChannelAdminLead bool,
	hasExplicitAdmin bool,
	hasExplicitLead bool,
	hasExplicitApprover bool,
	hasExplicitViewer bool,
	hasExplicitExcluded bool,
) []AccessSource {
	sources := []AccessSource{AccessSourceMember}

	if isSystemAdmin {
		sources = append(sources, AccessSourceSystemAdmin)
	}

	if isChannelAdminLead {
		sources = append(sources, AccessSourceChannelAdminRule)
	}

	if hasExplicitAdmin {
		sources = append(sources, AccessSourceExplicitAdmin)
	}

	if hasExplicitLead {
		sources = append(sources, AccessSourceExplicitLead)
	}

	if hasExplicitApprover {
		sources = append(sources, AccessSourceExplicitApprover)
	}

	if hasExplicitViewer {
		sources = append(sources, AccessSourceExplicitViewer)
	}

	if hasExplicitExcluded {
		sources = append(sources, AccessSourceExplicitExcluded)
	}

	return sources
}

/*
capabilitiesFromEffectiveRoles maps effective roles to capability booleans.

Lead retains the current MVP behavior of being able to manage workspace review,
reports, settings, and leave approvals. Explicit Approver remains leave-only.
*/
func capabilitiesFromEffectiveRoles(
	isSystemAdmin bool,
	isChannelAdminLead bool,
	hasExplicitAdmin bool,
	hasExplicitLead bool,
	hasExplicitApprover bool,
	hasExplicitViewer bool,
	hasExplicitExcluded bool,
) WorkspaceCapabilities {
	isAdmin := isSystemAdmin || hasExplicitAdmin
	isLead := isChannelAdminLead || hasExplicitLead

	var capabilities WorkspaceCapabilities

	if isAdmin {
		capabilities = WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      true,
			CanManageStandups:       true,
			CanViewWorkspaceReports: true,
			CanApproveLeaves:        true,
			CanViewGlobalReports:    true,
			CanExportReports:        true,
		}
	} else if isLead {
		capabilities = WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      true,
			CanManageStandups:       true,
			CanViewWorkspaceReports: true,
			CanApproveLeaves:        true,
			CanViewGlobalReports:    false,
			CanExportReports:        true,
		}
	} else if hasExplicitApprover {
		capabilities = WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      false,
			CanManageStandups:       false,
			CanViewWorkspaceReports: false,
			CanApproveLeaves:        true,
			CanViewGlobalReports:    false,
			CanExportReports:        false,
		}
	} else if hasExplicitViewer {
		capabilities = WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      false,
			CanManageStandups:       false,
			CanViewWorkspaceReports: true,
			CanApproveLeaves:        false,
			CanViewGlobalReports:    false,
			CanExportReports:        false,
		}
	} else {
		capabilities = WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      false,
			CanManageStandups:       false,
			CanViewWorkspaceReports: false,
			CanApproveLeaves:        false,
			CanViewGlobalReports:    false,
			CanExportReports:        false,
		}
	}

	if hasExplicitExcluded {
		capabilities.CanSubmitStandup = false
	}

	return capabilities
}

/*
roleLabelFromCapabilities returns a readable dominant access label.
*/
func roleLabelFromCapabilities(capabilities WorkspaceCapabilities) string {
	if capabilities.CanViewGlobalReports {
		return "Admin"
	}

	if capabilities.CanManageWorkspace {
		return "Lead"
	}

	if capabilities.CanApproveLeaves {
		return "Approver"
	}

	if capabilities.CanViewWorkspaceReports {
		return "Viewer"
	}

	if !capabilities.CanSubmitStandup {
		return "Excluded"
	}

	return "Member"
}
