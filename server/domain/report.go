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
ReportLanguage identifies the language used for generated report copy.
*/
type ReportLanguage string

const (
	/*
		ReportLanguageEnglish renders generated report labels in English.
	*/
	ReportLanguageEnglish ReportLanguage = "english"

	/*
		ReportLanguagePersian renders generated report labels in Persian.
	*/
	ReportLanguagePersian ReportLanguage = "persian"

	/*
		ReportLanguageArabic renders generated report labels in Arabic.
	*/
	ReportLanguageArabic ReportLanguage = "arabic"
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
	ReportLanguage  ReportLanguage

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
TimeReportGroupBy identifies a time report grouping mode.
*/
type TimeReportGroupBy string

const (
	/*
		TimeReportGroupByPerson groups time by Mattermost user ID.
	*/
	TimeReportGroupByPerson TimeReportGroupBy = "person"

	/*
		TimeReportGroupByProject groups time by project ID.
	*/
	TimeReportGroupByProject TimeReportGroupBy = "project"

	/*
		TimeReportGroupByCategory groups time by category ID.
	*/
	TimeReportGroupByCategory TimeReportGroupBy = "category"

	/*
		TimeReportGroupByTask groups time by task ID.
	*/
	TimeReportGroupByTask TimeReportGroupBy = "task"

	/*
		TimeReportGroupByDay groups time by local entry date.
	*/
	TimeReportGroupByDay TimeReportGroupBy = "day"

	/*
		TimeReportGroupByWeek groups time by local Monday-to-Sunday week.
	*/
	TimeReportGroupByWeek TimeReportGroupBy = "week"
)

/*
TimeReportSummary is a workspace time report result.
*/
type TimeReportSummary struct {
	WorkspaceID ID
	StartDate   LocalDate
	EndDate     LocalDate
	GroupBy     TimeReportGroupBy

	TotalMinutes int
	Rows         []TimeReportRow
}

/*
TimeReportRow is one aggregated time report row.
*/
type TimeReportRow struct {
	Key   string
	Label string

	UserID     string
	TaskID     ID
	ProjectID  ID
	CategoryID ID

	PeriodStart LocalDate
	PeriodEnd   LocalDate

	Minutes    int
	EntryCount int
}

/*
IsValid returns true when the time report grouping mode is supported.
*/
func (g TimeReportGroupBy) IsValid() bool {
	switch g {
	case TimeReportGroupByPerson,
		TimeReportGroupByProject,
		TimeReportGroupByCategory,
		TimeReportGroupByTask,
		TimeReportGroupByDay,
		TimeReportGroupByWeek:
		return true
	default:
		return false
	}
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
