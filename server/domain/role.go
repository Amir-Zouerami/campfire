package domain

/*
Role represents a simple Campfire role.

Campfire intentionally uses hardcoded role abilities instead of a complex
permission matrix.
*/
type Role string

const (
	/*
		RoleMember is the default participant role.
	*/
	RoleMember Role = "member"

	/*
		RoleLead can configure and manage a workspace.
	*/
	RoleLead Role = "lead"

	/*
		RoleApprover can approve or reject leave requests.
	*/
	RoleApprover Role = "approver"

	/*
		RoleAdmin can manage global Campfire settings and reports.
	*/
	RoleAdmin Role = "admin"

	/*
		RoleViewer can view selected dashboards and reports.
	*/
	RoleViewer Role = "viewer"
)

/*
IsValid returns true when the role is one of Campfire's supported simple roles.
*/
func (r Role) IsValid() bool {
	switch r {
	case RoleMember, RoleLead, RoleApprover, RoleAdmin, RoleViewer:
		return true
	default:
		return false
	}
}
