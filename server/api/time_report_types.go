package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
TimeReportRowPayload is the API representation of one time report row.
*/
type TimeReportRowPayload struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	UserID      string `json:"userId"`
	TaskID      string `json:"taskId"`
	ProjectID   string `json:"projectId"`
	CategoryID  string `json:"categoryId"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	Minutes     int    `json:"minutes"`
	EntryCount  int    `json:"entryCount"`
}

/*
TimeReportSummaryPayload is the API representation of a time report summary.
*/
type TimeReportSummaryPayload struct {
	WorkspaceID  string                 `json:"workspaceId"`
	StartDate    string                 `json:"startDate"`
	EndDate      string                 `json:"endDate"`
	GroupBy      string                 `json:"groupBy"`
	TotalMinutes int                    `json:"totalMinutes"`
	Rows         []TimeReportRowPayload `json:"rows"`
}

/*
GetTimeReportSummaryResponse is returned by GET /workspaces/{workspaceID}/reports/time-summary.
*/
type GetTimeReportSummaryResponse struct {
	Summary TimeReportSummaryPayload `json:"summary"`
}

/*
TimeReportSummaryToPayload maps a time report summary to API payload.
*/
func TimeReportSummaryToPayload(summary domain.TimeReportSummary) TimeReportSummaryPayload {
	return TimeReportSummaryPayload{
		WorkspaceID:  summary.WorkspaceID.String(),
		StartDate:    summary.StartDate.String(),
		EndDate:      summary.EndDate.String(),
		GroupBy:      string(summary.GroupBy),
		TotalMinutes: summary.TotalMinutes,
		Rows:         TimeReportRowsToPayload(summary.Rows),
	}
}

/*
TimeReportRowsToPayload maps time report rows to API payloads.
*/
func TimeReportRowsToPayload(rows []domain.TimeReportRow) []TimeReportRowPayload {
	payloads := make([]TimeReportRowPayload, 0, len(rows))

	for _, row := range rows {
		payloads = append(payloads, TimeReportRowToPayload(row))
	}

	return payloads
}

/*
TimeReportRowToPayload maps one time report row to API payload.
*/
func TimeReportRowToPayload(row domain.TimeReportRow) TimeReportRowPayload {
	return TimeReportRowPayload{
		Key:         row.Key,
		Label:       row.Label,
		UserID:      row.UserID,
		TaskID:      row.TaskID.String(),
		ProjectID:   row.ProjectID.String(),
		CategoryID:  row.CategoryID.String(),
		PeriodStart: row.PeriodStart.String(),
		PeriodEnd:   row.PeriodEnd.String(),
		Minutes:     row.Minutes,
		EntryCount:  row.EntryCount,
	}
}
