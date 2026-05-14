package api

/*
WorkspacePayload is the API representation of a Campfire workspace.
*/
type WorkspacePayload struct {
	ID          string `json:"id"`
	TeamID      string `json:"teamId"`
	ChannelID   string `json:"channelId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	BoardURL    string `json:"boardUrl"`
	Timezone    string `json:"timezone"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	IsArchived  bool   `json:"isArchived"`
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
CreateWorkspaceResponse is returned by POST /workspaces after persistence is added.
*/
type CreateWorkspaceResponse struct {
	Workspace WorkspacePayload `json:"workspace"`
}
