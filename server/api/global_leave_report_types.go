package api

import "github.com/amir-zouerami/campfire/server/service"

/*
GlobalLeaveReportRowPayload is one leave row in a global leave report.
*/
type GlobalLeaveReportRowPayload struct {
	WorkspaceID   string                     `json:"workspaceId"`
	WorkspaceName string                     `json:"workspaceName"`
	LeaveRequest  PendingLeaveRequestPayload `json:"leaveRequest"`
}

/*
GlobalLeaveReportWorkspaceSummaryPayload contains leave totals for one workspace.
*/
type GlobalLeaveReportWorkspaceSummaryPayload struct {
	WorkspaceID   string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
	ApprovedCount int    `json:"approvedCount"`
	PendingCount  int    `json:"pendingCount"`
}

/*
GlobalLeaveReportTypeSummaryPayload contains leave totals by type.
*/
type GlobalLeaveReportTypeSummaryPayload struct {
	LeaveTypeName  string `json:"leaveTypeName"`
	LeaveTypeColor string `json:"leaveTypeColor"`
	ApprovedCount  int    `json:"approvedCount"`
	PendingCount   int    `json:"pendingCount"`
}

/*
GlobalLeaveReportSummaryPayload is the API representation of a global leave report.
*/
type GlobalLeaveReportSummaryPayload struct {
	StartDate      string                                     `json:"startDate"`
	EndDate        string                                     `json:"endDate"`
	WorkspaceCount int                                        `json:"workspaceCount"`
	ApprovedCount  int                                        `json:"approvedCount"`
	PendingCount   int                                        `json:"pendingCount"`
	Rows           []GlobalLeaveReportRowPayload              `json:"rows"`
	Workspaces     []GlobalLeaveReportWorkspaceSummaryPayload `json:"workspaces"`
	Types          []GlobalLeaveReportTypeSummaryPayload      `json:"types"`
}

/*
GetGlobalLeaveReportSummaryResponse is returned by GET /reports/global/leaves.
*/
type GetGlobalLeaveReportSummaryResponse struct {
	Summary GlobalLeaveReportSummaryPayload `json:"summary"`
}

/*
GlobalLeaveReportSummaryToPayload maps a service summary to API payload.
*/
func GlobalLeaveReportSummaryToPayload(
	summary service.GlobalLeaveReportSummary,
) GlobalLeaveReportSummaryPayload {
	return GlobalLeaveReportSummaryPayload{
		StartDate:      summary.StartDate.String(),
		EndDate:        summary.EndDate.String(),
		WorkspaceCount: summary.WorkspaceCount,
		ApprovedCount:  summary.ApprovedCount,
		PendingCount:   summary.PendingCount,
		Rows:           GlobalLeaveReportRowsToPayload(summary.Rows),
		Workspaces:     GlobalLeaveReportWorkspaceSummariesToPayload(summary.Workspaces),
		Types:          GlobalLeaveReportTypeSummariesToPayload(summary.Types),
	}
}

/*
GlobalLeaveReportRowsToPayload maps global leave rows to API payloads.
*/
func GlobalLeaveReportRowsToPayload(rows []service.GlobalLeaveReportRow) []GlobalLeaveReportRowPayload {
	payloads := make([]GlobalLeaveReportRowPayload, 0, len(rows))

	for _, row := range rows {
		payloads = append(payloads, GlobalLeaveReportRowToPayload(row))
	}

	return payloads
}

/*
GlobalLeaveReportRowToPayload maps one global leave row to API payload.
*/
func GlobalLeaveReportRowToPayload(row service.GlobalLeaveReportRow) GlobalLeaveReportRowPayload {
	return GlobalLeaveReportRowPayload{
		WorkspaceID:   row.WorkspaceID.String(),
		WorkspaceName: row.WorkspaceName,
		LeaveRequest: PendingLeaveRequestPayload{
			LeaveRequest:   LeaveRequestToPayload(row.Leave.LeaveRequest),
			LeaveTypeName:  row.Leave.LeaveTypeName,
			LeaveTypeColor: row.Leave.LeaveTypeColor,
		},
	}
}

/*
GlobalLeaveReportWorkspaceSummariesToPayload maps workspace summaries to payloads.
*/
func GlobalLeaveReportWorkspaceSummariesToPayload(
	summaries []service.GlobalLeaveReportWorkspaceSummary,
) []GlobalLeaveReportWorkspaceSummaryPayload {
	payloads := make([]GlobalLeaveReportWorkspaceSummaryPayload, 0, len(summaries))

	for _, summary := range summaries {
		payloads = append(payloads, GlobalLeaveReportWorkspaceSummaryToPayload(summary))
	}

	return payloads
}

/*
GlobalLeaveReportWorkspaceSummaryToPayload maps one workspace summary to payload.
*/
func GlobalLeaveReportWorkspaceSummaryToPayload(
	summary service.GlobalLeaveReportWorkspaceSummary,
) GlobalLeaveReportWorkspaceSummaryPayload {
	return GlobalLeaveReportWorkspaceSummaryPayload{
		WorkspaceID:   summary.WorkspaceID.String(),
		WorkspaceName: summary.WorkspaceName,
		ApprovedCount: summary.ApprovedCount,
		PendingCount:  summary.PendingCount,
	}
}

/*
GlobalLeaveReportTypeSummariesToPayload maps type summaries to payloads.
*/
func GlobalLeaveReportTypeSummariesToPayload(
	summaries []service.GlobalLeaveReportTypeSummary,
) []GlobalLeaveReportTypeSummaryPayload {
	payloads := make([]GlobalLeaveReportTypeSummaryPayload, 0, len(summaries))

	for _, summary := range summaries {
		payloads = append(payloads, GlobalLeaveReportTypeSummaryToPayload(summary))
	}

	return payloads
}

/*
GlobalLeaveReportTypeSummaryToPayload maps one type summary to payload.
*/
func GlobalLeaveReportTypeSummaryToPayload(
	summary service.GlobalLeaveReportTypeSummary,
) GlobalLeaveReportTypeSummaryPayload {
	return GlobalLeaveReportTypeSummaryPayload{
		LeaveTypeName:  summary.LeaveTypeName,
		LeaveTypeColor: summary.LeaveTypeColor,
		ApprovedCount:  summary.ApprovedCount,
		PendingCount:   summary.PendingCount,
	}
}
