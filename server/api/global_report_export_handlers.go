package api

import (
	"encoding/csv"
	"strconv"

	"bytes"
	"net/http"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
handleExportGlobalTimeReportCSV handles global time report CSV export.
*/
func handleExportGlobalTimeReportCSV(
	log logger.Logger,
	mm mattermost.Client,
	globalReportService *service.GlobalReportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		summary, err := globalReportService.GetGlobalTimeSummary(
			r.Context(),
			service.GetGlobalTimeReportSummaryInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				StartDate:     r.URL.Query().Get("startDate"),
				EndDate:       r.URL.Query().Get("endDate"),
				GroupBy:       r.URL.Query().Get("groupBy"),
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		csvBytes, err := globalTimeReportCSV(*summary)
		if err != nil {
			WriteServiceError(w, service.NewError(service.ErrorCodeInternal, "Could not build global time CSV."))
			return
		}

		writeCSV(w, "campfire-global-time.csv", csvBytes)
	}
}

/*
handleExportGlobalLeaveReportCSV handles global leave report CSV export.
*/
func handleExportGlobalLeaveReportCSV(
	log logger.Logger,
	mm mattermost.Client,
	globalLeaveReportService *service.GlobalLeaveReportService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		summary, err := globalLeaveReportService.GetGlobalLeaveSummary(
			r.Context(),
			service.GetGlobalLeaveReportSummaryInput{
				ActorUserID:   user.ID,
				IsSystemAdmin: user.IsSystemAdmin,
				StartDate:     r.URL.Query().Get("startDate"),
				EndDate:       r.URL.Query().Get("endDate"),
			},
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		csvBytes, err := globalLeaveReportCSV(*summary)
		if err != nil {
			WriteServiceError(w, service.NewError(service.ErrorCodeInternal, "Could not build global leave CSV."))
			return
		}

		writeCSV(w, "campfire-global-leaves.csv", csvBytes)
	}
}

/*
globalTimeReportCSV builds a CSV document for a global time report.
*/
func globalTimeReportCSV(summary service.GlobalTimeReportSummary) ([]byte, error) {
	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"section",
		"start_date",
		"end_date",
		"group_by",
		"workspace_id",
		"workspace_name",
		"key",
		"label",
		"user_id",
		"task_id",
		"project_id",
		"category_id",
		"period_start",
		"period_end",
		"minutes",
		"entry_count",
	}); err != nil {
		return nil, err
	}

	for _, workspace := range summary.Workspaces {
		if err := writer.Write([]string{
			"workspace_total",
			summary.StartDate.String(),
			summary.EndDate.String(),
			string(summary.GroupBy),
			workspace.WorkspaceID.String(),
			workspace.WorkspaceName,
			"",
			workspace.WorkspaceName,
			"",
			"",
			"",
			"",
			"",
			"",
			strconv.Itoa(workspace.TotalMinutes),
			strconv.Itoa(workspace.EntryCount),
		}); err != nil {
			return nil, err
		}
	}

	for _, row := range summary.Rows {
		if err := writer.Write(globalTimeReportRowToCSV(summary, row)); err != nil {
			return nil, err
		}
	}

	writer.Flush()

	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

/*
globalTimeReportRowToCSV maps one global time row to CSV columns.
*/
func globalTimeReportRowToCSV(
	summary service.GlobalTimeReportSummary,
	row domain.TimeReportRow,
) []string {
	return []string{
		"grouped_row",
		summary.StartDate.String(),
		summary.EndDate.String(),
		string(summary.GroupBy),
		"",
		"",
		row.Key,
		row.Label,
		row.UserID,
		row.TaskID.String(),
		row.ProjectID.String(),
		row.CategoryID.String(),
		row.PeriodStart.String(),
		row.PeriodEnd.String(),
		strconv.Itoa(row.Minutes),
		strconv.Itoa(row.EntryCount),
	}
}

/*
globalLeaveReportCSV builds a CSV document for a global leave report.
*/
func globalLeaveReportCSV(summary service.GlobalLeaveReportSummary) ([]byte, error) {
	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"section",
		"start_date",
		"end_date",
		"workspace_id",
		"workspace_name",
		"user_id",
		"leave_request_id",
		"leave_type_name",
		"leave_type_color",
		"leave_start_date",
		"leave_end_date",
		"duration_mode",
		"half_day_part",
		"start_time",
		"end_time",
		"backup_user_id",
		"status",
		"approved_count",
		"pending_count",
	}); err != nil {
		return nil, err
	}

	for _, workspace := range summary.Workspaces {
		if err := writer.Write([]string{
			"workspace_total",
			summary.StartDate.String(),
			summary.EndDate.String(),
			workspace.WorkspaceID.String(),
			workspace.WorkspaceName,
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			strconv.Itoa(workspace.ApprovedCount),
			strconv.Itoa(workspace.PendingCount),
		}); err != nil {
			return nil, err
		}
	}

	for _, leaveType := range summary.Types {
		if err := writer.Write([]string{
			"leave_type_total",
			summary.StartDate.String(),
			summary.EndDate.String(),
			"",
			"",
			"",
			"",
			leaveType.LeaveTypeName,
			leaveType.LeaveTypeColor,
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			strconv.Itoa(leaveType.ApprovedCount),
			strconv.Itoa(leaveType.PendingCount),
		}); err != nil {
			return nil, err
		}
	}

	for _, row := range summary.Rows {
		leaveRequest := row.Leave.LeaveRequest

		if err := writer.Write([]string{
			"leave_row",
			summary.StartDate.String(),
			summary.EndDate.String(),
			row.WorkspaceID.String(),
			row.WorkspaceName,
			leaveRequest.UserID,
			leaveRequest.ID.String(),
			row.Leave.LeaveTypeName,
			row.Leave.LeaveTypeColor,
			leaveRequest.StartDate.String(),
			leaveRequest.EndDate.String(),
			string(leaveRequest.DurationMode),
			string(leaveRequest.HalfDayPart),
			leaveRequest.StartTime.String(),
			leaveRequest.EndTime.String(),
			leaveRequest.BackupUserID,
			string(leaveRequest.Status),
			"",
			"",
		}); err != nil {
			return nil, err
		}
	}

	writer.Flush()

	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}
