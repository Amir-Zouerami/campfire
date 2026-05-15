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
ReportRulePayload is the API representation of a report rule.
*/
type ReportRulePayload struct {
	ID              string `json:"id"`
	WorkspaceID     string `json:"workspaceId"`
	ScheduleID      string `json:"scheduleId"`
	Enabled         bool   `json:"enabled"`
	ReportKind      string `json:"reportKind"`
	PostToChannel   bool   `json:"postToChannel"`
	PreviewRequired bool   `json:"previewRequired"`
	SortMode        string `json:"sortMode"`
	IncludeOnLeave  bool   `json:"includeOnLeave"`
	IncludeMissing  bool   `json:"includeMissing"`
	IncludeTime     bool   `json:"includeTime"`
	IncludeBlockers bool   `json:"includeBlockers"`
	CreatedBy       string `json:"createdBy"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
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
ListReportRulesResponse is returned by GET /workspaces/{workspaceID}/reports/rules.
*/
type ListReportRulesResponse struct {
	ReportRules []ReportRulePayload `json:"reportRules"`
}

/*
UpdateReportRuleRequest is accepted by PUT /workspaces/{workspaceID}/reports/rules/{reportRuleID}.
*/
type UpdateReportRuleRequest struct {
	Enabled         bool   `json:"enabled"`
	PostToChannel   bool   `json:"postToChannel"`
	PreviewRequired bool   `json:"previewRequired"`
	SortMode        string `json:"sortMode"`
	IncludeOnLeave  bool   `json:"includeOnLeave"`
	IncludeMissing  bool   `json:"includeMissing"`
	IncludeTime     bool   `json:"includeTime"`
	IncludeBlockers bool   `json:"includeBlockers"`
}

/*
UpdateReportRuleResponse is returned by PUT /workspaces/{workspaceID}/reports/rules/{reportRuleID}.
*/
type UpdateReportRuleResponse struct {
	ReportRule ReportRulePayload `json:"reportRule"`
}

/*
GetDailyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/daily-preview.
*/
type GetDailyReportPreviewResponse struct {
	Preview DailyReportPreviewPayload `json:"preview"`
}

/*
WeeklyReportPreviewPayload is the API representation of a weekly report preview.
*/
type WeeklyReportPreviewPayload struct {
	WorkspaceID    string                      `json:"workspaceId"`
	PeriodStart    string                      `json:"periodStart"`
	PeriodEnd      string                      `json:"periodEnd"`
	SortMode       string                      `json:"sortMode"`
	DailyPreviews  []DailyReportPreviewPayload `json:"dailyPreviews"`
	SubmittedCount int                         `json:"submittedCount"`
	MissingCount   int                         `json:"missingCount"`
	OnLeaveCount   int                         `json:"onLeaveCount"`
	Markdown       string                      `json:"markdown"`
}

/*
GetWeeklyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/weekly-preview.
*/
type GetWeeklyReportPreviewResponse struct {
	Preview WeeklyReportPreviewPayload `json:"preview"`
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
PostWeeklyReportPreviewRequest is accepted by POST /workspaces/{workspaceID}/reports/weekly-preview/post.
*/
type PostWeeklyReportPreviewRequest struct {
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	SortMode    string `json:"sortMode"`
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
PostWeeklyReportPreviewResponse is returned after posting a weekly report preview.
*/
type PostWeeklyReportPreviewResponse struct {
	Preview WeeklyReportPreviewPayload `json:"preview"`
	Run     ReportRunPayload           `json:"run"`
	Posted  bool                       `json:"posted"`
}

/*
ReportRulesToPayload maps report rules to API payloads.
*/
func ReportRulesToPayload(rules []domain.ReportRule) []ReportRulePayload {
	payloads := make([]ReportRulePayload, 0, len(rules))

	for _, rule := range rules {
		payloads = append(payloads, ReportRuleToPayload(rule))
	}

	return payloads
}

/*
ReportRuleToPayload maps one report rule to an API payload.
*/
func ReportRuleToPayload(rule domain.ReportRule) ReportRulePayload {
	return ReportRulePayload{
		ID:              rule.ID.String(),
		WorkspaceID:     rule.WorkspaceID.String(),
		ScheduleID:      rule.ScheduleID.String(),
		Enabled:         rule.Enabled,
		ReportKind:      string(rule.ReportKind),
		PostToChannel:   rule.PostToChannel,
		PreviewRequired: rule.PreviewRequired,
		SortMode:        string(rule.SortMode),
		IncludeOnLeave:  rule.IncludeOnLeave,
		IncludeMissing:  rule.IncludeMissing,
		IncludeTime:     rule.IncludeTime,
		IncludeBlockers: rule.IncludeBlockers,
		CreatedBy:       rule.CreatedBy,
		CreatedAt:       formatAPITime(rule.CreatedAt),
		UpdatedAt:       formatAPITime(rule.UpdatedAt),
	}
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
WeeklyReportPreviewToPayload maps a weekly report preview to API payload.
*/
func WeeklyReportPreviewToPayload(preview domain.WeeklyReportPreview) WeeklyReportPreviewPayload {
	dailyPreviews := make([]DailyReportPreviewPayload, 0, len(preview.DailyPreviews))

	for _, dailyPreview := range preview.DailyPreviews {
		dailyPreviews = append(dailyPreviews, DailyReportPreviewToPayload(dailyPreview))
	}

	return WeeklyReportPreviewPayload{
		WorkspaceID:    preview.WorkspaceID.String(),
		PeriodStart:    preview.PeriodStart.String(),
		PeriodEnd:      preview.PeriodEnd.String(),
		SortMode:       string(preview.SortMode),
		DailyPreviews:  dailyPreviews,
		SubmittedCount: preview.SubmittedCount,
		MissingCount:   preview.MissingCount,
		OnLeaveCount:   preview.OnLeaveCount,
		Markdown:       preview.Markdown,
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
