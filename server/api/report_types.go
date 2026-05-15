package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
DailyReportAnswerRowPayload is the API representation of one report answer row.
*/
type DailyReportAnswerRowPayload struct {
	QuestionID    string `json:"questionId"`
	QuestionLabel string `json:"questionLabel"`
	ValueText     string `json:"valueText"`
	ShowInReport  bool   `json:"showInReport"`
	IsPrivate     bool   `json:"isPrivate"`
	Position      int    `json:"position"`
}

/*
DailyReportSubmissionRowPayload is the API representation of one report submission row.
*/
type DailyReportSubmissionRowPayload struct {
	UserID           string                        `json:"userId"`
	FirstSubmittedAt string                        `json:"firstSubmittedAt"`
	LastUpdatedAt    string                        `json:"lastUpdatedAt"`
	Answers          []DailyReportAnswerRowPayload `json:"answers"`
}

/*
DailyReportPreviewPayload is the API representation of a daily report preview.
*/
type DailyReportPreviewPayload struct {
	WorkspaceID    string `json:"workspaceId"`
	OccurrenceDate string `json:"occurrenceDate"`
	SortMode       string `json:"sortMode"`

	SubmittedUserIDs []string `json:"submittedUserIds"`
	MissingUserIDs   []string `json:"missingUserIds"`
	OnLeaveUserIDs   []string `json:"onLeaveUserIds"`

	Rows     []DailyReportSubmissionRowPayload `json:"rows"`
	Markdown string                            `json:"markdown"`
}

/*
ReportRunPayload is the API representation of a report run.
*/
type ReportRunPayload struct {
	ID               string `json:"id"`
	WorkspaceID      string `json:"workspaceId"`
	ReportRuleID     string `json:"reportRuleId"`
	ScheduleID       string `json:"scheduleId"`
	ReportKind       string `json:"reportKind"`
	PeriodStart      string `json:"periodStart"`
	PeriodEnd        string `json:"periodEnd"`
	GeneratedAt      string `json:"generatedAt"`
	PostedAt         string `json:"postedAt"`
	PostedBy         string `json:"postedBy"`
	MattermostPostID string `json:"mattermostPostId"`
	Markdown         string `json:"markdown"`
	Status           string `json:"status"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

/*
GetDailyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/daily-preview.
*/
type GetDailyReportPreviewResponse struct {
	Preview DailyReportPreviewPayload `json:"preview"`
}

/*
ListDailyReportRunsResponse is returned by GET /workspaces/{workspaceID}/reports/daily-runs.
*/
type ListDailyReportRunsResponse struct {
	Runs []ReportRunPayload `json:"runs"`
}

/*
PostDailyReportPreviewRequest is accepted by POST /workspaces/{workspaceID}/reports/daily-preview/post.
*/
type PostDailyReportPreviewRequest struct {
	OccurrenceDate string `json:"occurrenceDate"`
	SortMode       string `json:"sortMode"`
}

/*
PostDailyReportPreviewResponse is returned after posting a daily report preview.
*/
type PostDailyReportPreviewResponse struct {
	Preview DailyReportPreviewPayload `json:"preview"`
	Run     ReportRunPayload          `json:"run"`
	Posted  bool                      `json:"posted"`
}

/*
DailyReportPreviewToPayload maps a daily report preview to an API payload.
*/
func DailyReportPreviewToPayload(preview domain.DailyReportPreview) DailyReportPreviewPayload {
	return DailyReportPreviewPayload{
		WorkspaceID:    preview.WorkspaceID.String(),
		OccurrenceDate: preview.OccurrenceDate.String(),
		SortMode:       string(preview.SortMode),

		SubmittedUserIDs: preview.SubmittedUserIDs,
		MissingUserIDs:   preview.MissingUserIDs,
		OnLeaveUserIDs:   preview.OnLeaveUserIDs,

		Rows:     DailyReportSubmissionRowsToPayload(preview.Rows),
		Markdown: preview.Markdown,
	}
}

/*
ReportRunToPayload maps a report run to an API payload.
*/
func ReportRunToPayload(run domain.ReportRun) ReportRunPayload {
	return ReportRunPayload{
		ID:               run.ID.String(),
		WorkspaceID:      run.WorkspaceID.String(),
		ReportRuleID:     run.ReportRuleID.String(),
		ScheduleID:       run.ScheduleID.String(),
		ReportKind:       string(run.ReportKind),
		PeriodStart:      run.PeriodStart.String(),
		PeriodEnd:        run.PeriodEnd.String(),
		GeneratedAt:      formatAPITime(run.GeneratedAt),
		PostedAt:         formatOptionalAPITime(run.PostedAt),
		PostedBy:         run.PostedBy,
		MattermostPostID: run.MattermostPostID,
		Markdown:         run.Markdown,
		Status:           string(run.Status),
		CreatedAt:        formatAPITime(run.CreatedAt),
		UpdatedAt:        formatAPITime(run.UpdatedAt),
	}
}

/*
ReportRunsToPayload maps report runs to API payloads.
*/
func ReportRunsToPayload(runs []domain.ReportRun) []ReportRunPayload {
	payloads := make([]ReportRunPayload, 0, len(runs))

	for _, run := range runs {
		payloads = append(payloads, ReportRunToPayload(run))
	}

	return payloads
}

/*
DailyReportSubmissionRowsToPayload maps daily report submission rows.
*/
func DailyReportSubmissionRowsToPayload(
	rows []domain.DailyReportSubmissionRow,
) []DailyReportSubmissionRowPayload {
	payloads := make([]DailyReportSubmissionRowPayload, 0, len(rows))

	for _, row := range rows {
		payloads = append(payloads, DailyReportSubmissionRowToPayload(row))
	}

	return payloads
}

/*
DailyReportSubmissionRowToPayload maps one daily report submission row.
*/
func DailyReportSubmissionRowToPayload(row domain.DailyReportSubmissionRow) DailyReportSubmissionRowPayload {
	return DailyReportSubmissionRowPayload{
		UserID:           row.UserID,
		FirstSubmittedAt: formatAPITime(row.FirstSubmittedAt),
		LastUpdatedAt:    formatAPITime(row.LastUpdatedAt),
		Answers:          DailyReportAnswerRowsToPayload(row.Answers),
	}
}

/*
DailyReportAnswerRowsToPayload maps daily report answer rows.
*/
func DailyReportAnswerRowsToPayload(rows []domain.DailyReportAnswerRow) []DailyReportAnswerRowPayload {
	payloads := make([]DailyReportAnswerRowPayload, 0, len(rows))

	for _, row := range rows {
		payloads = append(payloads, DailyReportAnswerRowToPayload(row))
	}

	return payloads
}

/*
DailyReportAnswerRowToPayload maps one daily report answer row.
*/
func DailyReportAnswerRowToPayload(row domain.DailyReportAnswerRow) DailyReportAnswerRowPayload {
	return DailyReportAnswerRowPayload{
		QuestionID:    row.QuestionID.String(),
		QuestionLabel: row.QuestionLabel,
		ValueText:     row.ValueText,
		ShowInReport:  row.ShowInReport,
		IsPrivate:     row.IsPrivate,
		Position:      row.Position,
	}
}
