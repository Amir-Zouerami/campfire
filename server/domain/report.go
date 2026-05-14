package domain

import "time"

/*
ReportKind identifies the type of report Campfire can generate.
*/
type ReportKind string

const (
	/*
		ReportKindDaily identifies the daily standup report.
	*/
	ReportKindDaily ReportKind = "daily"

	/*
		ReportKindWeekly identifies the weekly summary report.
	*/
	ReportKindWeekly ReportKind = "weekly"

	/*
		ReportKindBlockers identifies a blockers report.
	*/
	ReportKindBlockers ReportKind = "blockers"

	/*
		ReportKindMissing identifies a missing/late report.
	*/
	ReportKindMissing ReportKind = "missing"

	/*
		ReportKindTime identifies a time report.
	*/
	ReportKindTime ReportKind = "time"
)

/*
ReportSortMode identifies supported report sorting modes.
*/
type ReportSortMode string

const (
	/*
		ReportSortName sorts users by name.
	*/
	ReportSortName ReportSortMode = "name"

	/*
		ReportSortFirstSubmitted sorts users by first submitted time.
	*/
	ReportSortFirstSubmitted ReportSortMode = "first_submitted"

	/*
		ReportSortLastSubmitted sorts users by last submitted time.
	*/
	ReportSortLastSubmitted ReportSortMode = "last_submitted"

	/*
		ReportSortMissingFirst moves missing users first.
	*/
	ReportSortMissingFirst ReportSortMode = "missing_first"

	/*
		ReportSortBlockersFirst moves blockers first.
	*/
	ReportSortBlockersFirst ReportSortMode = "blockers_first"
)

/*
ReportRule defines generated report behavior for a schedule.
*/
type ReportRule struct {
	ID          ID
	WorkspaceID ID
	ScheduleID  ID

	Enabled bool

	ReportKind ReportKind

	PostToChannel   bool
	PreviewRequired bool

	SortMode ReportSortMode

	IncludeOnLeave  bool
	IncludeMissing  bool
	IncludeTime     bool
	IncludeBlockers bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
IsValid returns true when the report kind is supported by Campfire MVP.
*/
func (k ReportKind) IsValid() bool {
	switch k {
	case ReportKindDaily, ReportKindWeekly, ReportKindBlockers, ReportKindMissing, ReportKindTime:
		return true
	default:
		return false
	}
}

/*
IsValid returns true when the report sort mode is supported by Campfire MVP.
*/
func (m ReportSortMode) IsValid() bool {
	switch m {
	case ReportSortName,
		ReportSortFirstSubmitted,
		ReportSortLastSubmitted,
		ReportSortMissingFirst,
		ReportSortBlockersFirst:
		return true
	default:
		return false
	}
}
