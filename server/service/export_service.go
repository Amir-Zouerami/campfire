package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ExportWorkspaceTimeCSVInput contains workspace time CSV filters.
*/
type ExportWorkspaceTimeCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
}

/*
ExportWorkspaceLeavesCSVInput contains workspace leave CSV filters.
*/
type ExportWorkspaceLeavesCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
}

/*
ExportService builds CSV exports for workspace reports.
*/
type ExportService struct {
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	taskStore          store.TaskStore
	leaveStore         store.LeaveStore
}

/*
NewExportService creates an export service.
*/
func NewExportService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	taskStore store.TaskStore,
	leaveStore store.LeaveStore,
) *ExportService {
	return &ExportService{
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		taskStore:          taskStore,
		leaveStore:         leaveStore,
	}
}

/*
ExportWorkspaceTimeCSV returns a CSV file for workspace time entries.
*/
func (s *ExportService) ExportWorkspaceTimeCSV(
	ctx context.Context,
	input ExportWorkspaceTimeCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries for export.")
	}

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"id",
		"workspace_id",
		"task_id",
		"user_id",
		"entry_date",
		"minutes",
		"note",
		"project_id",
		"category_id",
		"created_by",
		"created_at",
		"updated_at",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write time export header.")
	}

	for _, entry := range entries {
		if err := writer.Write([]string{
			entry.ID.String(),
			entry.WorkspaceID.String(),
			entry.TaskID.String(),
			entry.UserID,
			entry.EntryDate.String(),
			strconv.Itoa(entry.Minutes),
			entry.Note,
			entry.ProjectID.String(),
			entry.CategoryID.String(),
			entry.CreatedBy,
			formatExportTime(entry.CreatedAt),
			formatExportTime(entry.UpdatedAt),
		}); err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not write time export row.")
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize time export.")
	}

	return buffer.Bytes(), nil
}

/*
ExportWorkspaceLeavesCSV returns a CSV file for approved workspace leave requests.
*/
func (s *ExportService) ExportWorkspaceLeavesCSV(
	ctx context.Context,
	input ExportWorkspaceLeavesCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	leaveRequests, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load leave requests for export.")
	}

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"id",
		"workspace_id",
		"user_id",
		"leave_type_id",
		"leave_type_name",
		"leave_type_color",
		"start_date",
		"end_date",
		"duration_mode",
		"half_day_part",
		"start_time",
		"end_time",
		"backup_user_id",
		"status",
		"created_at",
		"updated_at",
		"cancelled_at",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write leave export header.")
	}

	for _, row := range leaveRequests {
		leaveRequest := row.LeaveRequest

		if err := writer.Write([]string{
			leaveRequest.ID.String(),
			leaveRequest.WorkspaceID.String(),
			leaveRequest.UserID,
			leaveRequest.LeaveTypeID.String(),
			row.LeaveTypeName,
			row.LeaveTypeColor,
			leaveRequest.StartDate.String(),
			leaveRequest.EndDate.String(),
			string(leaveRequest.DurationMode),
			string(leaveRequest.HalfDayPart),
			leaveRequest.StartTime.String(),
			leaveRequest.EndTime.String(),
			leaveRequest.BackupUserID,
			string(leaveRequest.Status),
			formatExportTime(leaveRequest.CreatedAt),
			formatExportTime(leaveRequest.UpdatedAt),
			formatOptionalExportTime(leaveRequest.CancelledAt),
		}); err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not write leave export row.")
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize leave export.")
	}

	return buffer.Bytes(), nil
}

/*
validateExportRequest validates common CSV export filters and permissions.
*/
func (s *ExportService) validateExportRequest(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceIDValue string,
	startDateValue string,
	endDateValue string,
) (domain.ID, domain.LocalDate, domain.LocalDate, error) {
	cleanActorUserID := strings.TrimSpace(actorUserID)
	if cleanActorUserID == "" {
		return "", "", "", NewError(ErrorCodePermissionDenied, "You must be signed in to export reports.")
	}

	cleanWorkspaceID := strings.TrimSpace(workspaceIDValue)
	if cleanWorkspaceID == "" {
		return "", "", "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", "", "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", "", "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireExportPermission(ctx, cleanActorUserID, isSystemAdmin, workspaceID); err != nil {
		return "", "", "", err
	}

	startDate := domain.LocalDate(strings.TrimSpace(startDateValue))
	if _, err := parseLocalDate(startDate); err != nil {
		return "", "", "", NewError(ErrorCodeValidationFailed, "Start date must be a real YYYY-MM-DD calendar date.")
	}

	endDate := domain.LocalDate(strings.TrimSpace(endDateValue))
	if _, err := parseLocalDate(endDate); err != nil {
		return "", "", "", NewError(ErrorCodeValidationFailed, "End date must be a real YYYY-MM-DD calendar date.")
	}

	if endDate.String() < startDate.String() {
		return "", "", "", NewError(ErrorCodeValidationFailed, "End date cannot be before start date.")
	}

	return workspaceID, startDate, endDate, nil
}

/*
requireExportPermission verifies that an actor can export workspace reports.
*/
func (s *ExportService) requireExportPermission(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID domain.ID,
) error {
	if isSystemAdmin {
		return nil
	}

	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspaceID,
		actorUserID,
		[]domain.Role{domain.RoleLead, domain.RoleAdmin, domain.RoleViewer},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify report export permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Viewers, Admins, and System Admins can export reports.")
	}

	return nil
}

/*
formatExportTime formats a UTC timestamp for CSV.
*/
func formatExportTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.UTC().Format(time.RFC3339)
}

/*
formatOptionalExportTime formats an optional UTC timestamp for CSV.
*/
func formatOptionalExportTime(value *time.Time) string {
	if value == nil {
		return ""
	}

	return formatExportTime(*value)
}
