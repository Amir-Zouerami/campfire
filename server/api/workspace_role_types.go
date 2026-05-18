package api

import (
	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
WorkspaceRoleSettingsPayload is the API representation of workspace role behavior settings.
*/
type WorkspaceRoleSettingsPayload struct {
	WorkspaceID           string `json:"workspaceId"`
	ChannelAdminsAreLeads bool   `json:"channelAdminsAreLeads"`
	SystemAdminsAreAdmins bool   `json:"systemAdminsAreAdmins"`
	CreatedAt             string `json:"createdAt"`
	UpdatedAt             string `json:"updatedAt"`
}

/*
WorkspaceRoleOverviewPayload is the API representation of workspace roles.
*/
type WorkspaceRoleOverviewPayload struct {
	WorkspaceID string `json:"workspaceId"`

	Settings WorkspaceRoleSettingsPayload `json:"settings"`

	MemberUserIDs   []string `json:"memberUserIds"`
	LeadUserIDs     []string `json:"leadUserIds"`
	ApproverUserIDs []string `json:"approverUserIds"`
	AdminUserIDs    []string `json:"adminUserIds"`
	ViewerUserIDs   []string `json:"viewerUserIds"`
}

/*
ListWorkspaceRolesResponse is returned by GET /workspaces/{workspaceID}/roles.
*/
type ListWorkspaceRolesResponse struct {
	Roles WorkspaceRoleOverviewPayload `json:"roles"`
}

/*
WorkspaceRoleOverviewToPayload maps a service role overview to API payload.
*/
func WorkspaceRoleOverviewToPayload(overview service.WorkspaceRoleOverview) WorkspaceRoleOverviewPayload {
	return WorkspaceRoleOverviewPayload{
		WorkspaceID: overview.WorkspaceID.String(),
		Settings:    WorkspaceRoleSettingsToPayload(overview.Settings),

		MemberUserIDs:   overview.MemberUserIDs,
		LeadUserIDs:     overview.LeadUserIDs,
		ApproverUserIDs: overview.ApproverUserIDs,
		AdminUserIDs:    overview.AdminUserIDs,
		ViewerUserIDs:   overview.ViewerUserIDs,
	}
}

/*
WorkspaceRoleSettingsToPayload maps workspace role settings to API payload.
*/
func WorkspaceRoleSettingsToPayload(settings domain.WorkspaceRoleSettings) WorkspaceRoleSettingsPayload {
	return WorkspaceRoleSettingsPayload{
		WorkspaceID:           settings.WorkspaceID.String(),
		ChannelAdminsAreLeads: settings.ChannelAdminsAreLeads,
		SystemAdminsAreAdmins: settings.SystemAdminsAreAdmins,
		CreatedAt:             formatAPITime(settings.CreatedAt),
		UpdatedAt:             formatAPITime(settings.UpdatedAt),
	}
}
