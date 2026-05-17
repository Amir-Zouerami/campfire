package domain

import "time"

/*
ReportKind identifies a generated report kind.
*/
type ReportKind string

const (
	/*
		ReportKindDaily identifies daily standup reports.
	*/
	ReportKindDaily ReportKind = "daily"

	/*
		ReportKindWeekly identifies weekly standup reports.
	*/
	ReportKindWeekly ReportKind = "weekly"

	/*
		ReportKindBlockers identifies blocker-focused reports.
	*/
	ReportKindBlockers ReportKind = "blockers"

	/*
		ReportKindMissing identifies missing-submission reports.
	*/
	ReportKindMissing ReportKind = "missing"

	/*
		ReportKindTime identifies time-focused reports.
	*/
	ReportKindTime ReportKind = "time"
)

/*
ReportSortMode identifies report row ordering behavior.
*/
type ReportSortMode string

const (
	/*
		ReportSortName sorts report rows by user name or user ID.
	*/
	ReportSortName ReportSortMode = "name"

	/*
		ReportSortFirstSubmitted sorts report rows by first submitted timestamp.
	*/
	ReportSortFirstSubmitted ReportSortMode = "first_submitted"

	/*
		ReportSortLastSubmitted sorts report rows by last submitted timestamp.
	*/
	ReportSortLastSubmitted ReportSortMode = "last_submitted"

	/*
		ReportSortBlockersFirst sorts blocker rows before non-blocker rows.

		This is used by seeded report rules and will become more important once
		blocker-specific report sections are wired into the report builder.
	*/
	ReportSortBlockersFirst ReportSortMode = "blockers_first"
)

/*
ReportRunStatus identifies the lifecycle state of a generated report run.
*/
type ReportRunStatus string

const (
	/*
		ReportRunStatusPosting means Campfire reserved the run and is posting it.
	*/
	ReportRunStatusPosting ReportRunStatus = "posting"

	/*
		ReportRunStatusPosted means the report was posted successfully.
	*/
	ReportRunStatusPosted ReportRunStatus = "posted"

	/*
		ReportRunStatusFailed means Campfire reserved the run but posting failed.
	*/
	ReportRunStatusFailed ReportRunStatus = "failed"
)

/*
ReportRule describes a workspace report automation rule.
*/
type ReportRule struct {
	ID          ID
	WorkspaceID ID
	ScheduleID  ID

	Enabled         bool
	ReportKind      ReportKind
	PostToChannel   bool
	PreviewRequired bool
	SortMode        ReportSortMode

	IncludeOnLeave  bool
	IncludeMissing  bool
	IncludeTime     bool
	IncludeBlockers bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
ReportRun records one generated or posted report.
*/
type ReportRun struct {
	ID           ID
	WorkspaceID  ID
	ReportRuleID ID
	ScheduleID   ID

	ReportKind  ReportKind
	PeriodStart LocalDate
	PeriodEnd   LocalDate

	GeneratedAt      time.Time
	PostedAt         *time.Time
	PostedBy         string
	MattermostPostID string

	Markdown string
	Status   ReportRunStatus

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
SavedReportFilterScope identifies where a saved report filter can be used.
*/
type SavedReportFilterScope string

const (
	/*
		SavedReportFilterScopeWorkspace identifies a workspace-scoped saved filter.
	*/
	SavedReportFilterScopeWorkspace SavedReportFilterScope = "workspace"
)

/*
SavedReportFilter records one user-owned saved report filter.
*/
type SavedReportFilter struct {
	ID          ID
	WorkspaceID ID

	UserID     string
	Name       string
	Scope      SavedReportFilterScope
	ReportType ReportKind
	FilterJSON string

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
IsValid returns true when the saved report filter scope is supported.
*/
func (s SavedReportFilterScope) IsValid() bool {
	switch s {
	case SavedReportFilterScopeWorkspace:
		return true
	default:
		return false
	}
}
