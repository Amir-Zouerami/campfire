package domain

import "time"

/*
Workspace represents Campfire configuration for a Mattermost channel.

Each active workspace is usually linked to one Mattermost channel.
*/
type Workspace struct {
	ID ID

	TeamID    string
	ChannelID string

	Name        string
	Description string
	BoardURL    string

	/*
		ApprovedLeaveNotificationChannelID optionally routes approved-leave and
		approved-leave-cancelled announcements to a fixed Mattermost channel.

		When empty, Campfire posts those announcements to the workspace channel.
	*/
	ApprovedLeaveNotificationChannelID string

	Timezone string

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time

	IsArchived bool
}

/*
WorkspaceWorkingDay stores whether a weekday is enabled for a workspace.

Weekday follows Go's time.Weekday numbering:
  - 0 Sunday
  - 1 Monday
  - 2 Tuesday
  - 3 Wednesday
  - 4 Thursday
  - 5 Friday
  - 6 Saturday
*/
type WorkspaceWorkingDay struct {
	ID          ID
	WorkspaceID ID
	Weekday     time.Weekday
	Enabled     bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

/*
WorkspaceSkipDate represents a workspace-level holiday or no-standup day.

Date is stored as YYYY-MM-DD in the workspace timezone.
*/
type WorkspaceSkipDate struct {
	ID          ID
	WorkspaceID ID
	Date        LocalDate
	Label       string
	CreatedBy   string
	CreatedAt   time.Time
}

/*
WorkspaceRoleAssignment assigns a simple Campfire role to a Mattermost user.
*/
type WorkspaceRoleAssignment struct {
	ID          ID
	WorkspaceID ID
	UserID      string
	Role        Role
	CreatedBy   string
	CreatedAt   time.Time
}

/*
WorkspaceRoleSettings controls simple role behavior for a workspace.
*/
type WorkspaceRoleSettings struct {
	WorkspaceID ID

	ChannelAdminsAreLeads bool
	SystemAdminsAreAdmins bool

	CreatedAt time.Time
	UpdatedAt time.Time
}
