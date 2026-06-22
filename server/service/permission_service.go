package service

import (
	"context"
	"errors"
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
	channelAdminChecker ChannelAdminChecker
}

/*
NewPermissionService creates a centralized permission service.
*/
func NewPermissionService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	channelAdminChecker ChannelAdminChecker,
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

	hasExplicitAdmin, err := s.userHasRole(ctx, workspace.ID, cleanUserID, domain.RoleAdmin)
	if err != nil {
		return nil, err
	}

	hasExplicitLead, err := s.userHasRole(ctx, workspace.ID, cleanUserID, domain.RoleLead)
	if err != nil {
		return nil, err
	}

	hasExplicitApprover, err := s.userHasRole(ctx, workspace.ID, cleanUserID, domain.RoleApprover)
	if err != nil {
		return nil, err
	}

	hasExplicitViewer, err := s.userHasRole(ctx, workspace.ID, cleanUserID, domain.RoleViewer)
	if err != nil {
		return nil, err
	}

	hasExplicitExcluded, err := s.userHasRole(ctx, workspace.ID, cleanUserID, domain.RoleExcluded)
	if err != nil {
		return nil, err
	}

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
userHasRole checks one explicit Campfire role assignment.
*/
func (s *PermissionService) userHasRole(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	role domain.Role,
) (bool, error) {
	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(ctx, workspaceID, userID, []domain.Role{role})
	if err != nil {
		return false, NewError(ErrorCodeInternal, "Could not verify workspace role access.")
	}

	return hasRole, nil
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
