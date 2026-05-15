package domain

import "time"

/*
DailyReportPreview is a generated daily report preview.

It is not persisted yet. MVP preview generation lets workspace leads inspect the
Markdown before later phases add posting, approval, and scheduled report jobs.
*/
type DailyReportPreview struct {
	WorkspaceID    ID
	OccurrenceDate LocalDate
	SortMode       StandupSubmissionSortMode

	SubmittedUserIDs []string
	MissingUserIDs   []string
	OnLeaveUserIDs   []string

	Rows     []DailyReportSubmissionRow
	Markdown string
}

/*
DailyReportSubmissionRow contains one user's submitted standup data for a report.
*/
type DailyReportSubmissionRow struct {
	UserID           string
	FirstSubmittedAt time.Time
	LastUpdatedAt    time.Time

	Answers []DailyReportAnswerRow
}

/*
DailyReportAnswerRow contains one answer formatted for report display.
*/
type DailyReportAnswerRow struct {
	QuestionID    ID
	QuestionLabel string
	ValueText     string
	ShowInReport  bool
	IsPrivate     bool
	Position      int
}
