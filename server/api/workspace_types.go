package api

import (
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
WorkspacePayload is the API representation of a Campfire workspace.
*/
type WorkspacePayload struct {
	ID                                 string `json:"id"`
	TeamID                             string `json:"teamId"`
	ChannelID                          string `json:"channelId"`
	Name                               string `json:"name"`
	Description                        string `json:"description"`
	BoardURL                           string `json:"boardUrl"`
	ApprovedLeaveNotificationChannelID string `json:"approvedLeaveNotificationChannelId"`
	Timezone                           string `json:"timezone"`
	CreatedBy                          string `json:"createdBy"`
	CreatedAt                          string `json:"createdAt"`
	UpdatedAt                          string `json:"updatedAt"`
	IsArchived                         bool   `json:"isArchived"`
}

/*
WorkspaceCapabilitiesPayload describes actions the current user can perform
inside a workspace.
*/
type WorkspaceCapabilitiesPayload struct {
	CanSubmitStandup        bool `json:"canSubmitStandup"`
	CanManageWorkspace      bool `json:"canManageWorkspace"`
	CanManageStandups       bool `json:"canManageStandups"`
	CanViewWorkspaceReports bool `json:"canViewWorkspaceReports"`
	CanApproveLeaves        bool `json:"canApproveLeaves"`
	CanViewGlobalReports    bool `json:"canViewGlobalReports"`
	CanExportReports        bool `json:"canExportReports"`
}

/*
WorkspaceByChannelResponse is returned by GET /workspaces/by-channel/{channelID}.
*/
type WorkspaceByChannelResponse struct {
	Workspace    WorkspacePayload             `json:"workspace"`
	Capabilities WorkspaceCapabilitiesPayload `json:"capabilities"`
}

/*
CreateWorkspaceRequest is accepted by POST /workspaces.
*/
type CreateWorkspaceRequest struct {
	TeamID                 string   `json:"teamId"`
	ChannelID              string   `json:"channelId"`
	Name                   string   `json:"name"`
	Description            string   `json:"description"`
	BoardURL               string   `json:"boardUrl"`
	Timezone               string   `json:"timezone"`
	WorkingDays            []int    `json:"workingDays"`
	ChannelAdminsAreLeads  bool     `json:"channelAdminsAreLeads"`
	NamedLeadUserIDs       []string `json:"namedLeadUserIds"`
	NamedApproverUserIDs   []string `json:"namedApproverUserIds"`
	CreateDefaultTemplates bool     `json:"createDefaultTemplates"`
}

/*
UpdateWorkspaceNotificationSettingsRequest updates workspace notification routing.
*/
type UpdateWorkspaceNotificationSettingsRequest struct {
	ApprovedLeaveNotificationChannelID string `json:"approvedLeaveNotificationChannelId"`
}

/*
CreateWorkspaceResponse is returned by POST /workspaces.
*/
type CreateWorkspaceResponse struct {
	Workspace WorkspacePayload `json:"workspace"`
}

/*
UpdateWorkspaceNotificationSettingsResponse is returned after workspace notification settings are updated.
*/
type UpdateWorkspaceNotificationSettingsResponse struct {
	Workspace WorkspacePayload `json:"workspace"`
}

/*
DeleteWorkspaceResponse is returned by DELETE /workspaces/{workspaceID}.
*/
type DeleteWorkspaceResponse struct {
	Deleted bool `json:"deleted"`
}

/*
WorkspaceResultToResponse maps a service result to an API response.
*/
func WorkspaceResultToResponse(result service.WorkspaceByChannelResult) WorkspaceByChannelResponse {
	return WorkspaceByChannelResponse{
		Workspace:    WorkspaceToPayload(result.Workspace),
		Capabilities: CapabilitiesToPayload(result.Capabilities),
	}
}

/*
WorkspaceToPayload maps a domain workspace to its API representation.
*/
func WorkspaceToPayload(workspace domain.Workspace) WorkspacePayload {
	return WorkspacePayload{
		ID:                                 workspace.ID.String(),
		TeamID:                             workspace.TeamID,
		ChannelID:                          workspace.ChannelID,
		Name:                               workspace.Name,
		Description:                        workspace.Description,
		BoardURL:                           workspace.BoardURL,
		ApprovedLeaveNotificationChannelID: workspace.ApprovedLeaveNotificationChannelID,
		Timezone:                           workspace.Timezone,
		CreatedBy:                          workspace.CreatedBy,
		CreatedAt:                          formatAPITime(workspace.CreatedAt),
		UpdatedAt:                          formatAPITime(workspace.UpdatedAt),
		IsArchived:                         workspace.IsArchived,
	}
}

/*
CapabilitiesToPayload maps service capabilities to their API representation.
*/
func CapabilitiesToPayload(capabilities service.WorkspaceCapabilities) WorkspaceCapabilitiesPayload {
	return WorkspaceCapabilitiesPayload{
		CanSubmitStandup:        capabilities.CanSubmitStandup,
		CanManageWorkspace:      capabilities.CanManageWorkspace,
		CanManageStandups:       capabilities.CanManageStandups,
		CanViewWorkspaceReports: capabilities.CanViewWorkspaceReports,
		CanApproveLeaves:        capabilities.CanApproveLeaves,
		CanViewGlobalReports:    capabilities.CanViewGlobalReports,
		CanExportReports:        capabilities.CanExportReports,
	}
}

/*
ToServiceInput maps an API create-workspace request to a service input.
*/
func (r CreateWorkspaceRequest) ToServiceInput(actorUserID string) service.CreateWorkspaceInput {
	return service.CreateWorkspaceInput{
		ActorUserID:            actorUserID,
		TeamID:                 r.TeamID,
		ChannelID:              r.ChannelID,
		Name:                   r.Name,
		Description:            r.Description,
		BoardURL:               r.BoardURL,
		Timezone:               r.Timezone,
		WorkingDays:            r.WorkingDays,
		ChannelAdminsAreLeads:  r.ChannelAdminsAreLeads,
		NamedLeadUserIDs:       r.NamedLeadUserIDs,
		NamedApproverUserIDs:   r.NamedApproverUserIDs,
		CreateDefaultTemplates: r.CreateDefaultTemplates,
	}
}

/*
ToServiceInput maps workspace notification settings to service input.
*/
func (r UpdateWorkspaceNotificationSettingsRequest) ToServiceInput(
	actorUserID string,
	workspaceID string,
) service.UpdateWorkspaceNotificationSettingsInput {
	return service.UpdateWorkspaceNotificationSettingsInput{
		ActorUserID:                        actorUserID,
		WorkspaceID:                        workspaceID,
		ApprovedLeaveNotificationChannelID: r.ApprovedLeaveNotificationChannelID,
	}
}

/*
formatAPITime formats a timestamp for JSON API responses.
*/
func formatAPITime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.UTC().Format(time.RFC3339)
}
