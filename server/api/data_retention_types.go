package api

import "github.com/amir-zouerami/campfire/server/service"

/*
DataRetentionSummaryPayload is the API representation of purgeable old rows.
*/
type DataRetentionSummaryPayload struct {
	CutoffDate         string `json:"cutoffDate"`
	StandupSubmissions int    `json:"standupSubmissions"`
	StandupAnswers     int    `json:"standupAnswers"`
	LeaveRequests      int    `json:"leaveRequests"`
	LeaveDecisions     int    `json:"leaveDecisions"`
	TimeEntries        int    `json:"timeEntries"`
	ReportRuns         int    `json:"reportRuns"`
	NotificationRuns   int    `json:"notificationRuns"`
	AuditLogEntries    int    `json:"auditLogEntries"`
	TotalRows          int    `json:"totalRows"`
}

/*
GetDataRetentionPreviewResponse is returned by GET /workspaces/{workspaceID}/admin/data-retention/preview.
*/
type GetDataRetentionPreviewResponse struct {
	Summary DataRetentionSummaryPayload `json:"summary"`
}

/*
PurgeWorkspaceDataRequest is accepted by POST /workspaces/{workspaceID}/admin/data-retention/purge.
*/
type PurgeWorkspaceDataRequest struct {
	CutoffDate string `json:"cutoffDate"`
}

/*
PurgeWorkspaceDataResponse is returned by POST /workspaces/{workspaceID}/admin/data-retention/purge.
*/
type PurgeWorkspaceDataResponse struct {
	Summary DataRetentionSummaryPayload `json:"summary"`
	Deleted bool                        `json:"deleted"`
}

/*
DataRetentionSummaryToPayload maps a service retention summary to API payload.
*/
func DataRetentionSummaryToPayload(summary service.DataRetentionSummary) DataRetentionSummaryPayload {
	return DataRetentionSummaryPayload{
		CutoffDate:         summary.CutoffDate.String(),
		StandupSubmissions: summary.StandupSubmissions,
		StandupAnswers:     summary.StandupAnswers,
		LeaveRequests:      summary.LeaveRequests,
		LeaveDecisions:     summary.LeaveDecisions,
		TimeEntries:        summary.TimeEntries,
		ReportRuns:         summary.ReportRuns,
		NotificationRuns:   summary.NotificationRuns,
		AuditLogEntries:    summary.AuditLogEntries,
		TotalRows:          summary.TotalRows,
	}
}
