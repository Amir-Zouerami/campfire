package service

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
GetTimeReportSummaryInput contains workspace time report filters.
*/
type GetTimeReportSummaryInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
	GroupBy       string
}

/*
TimeReportService builds workspace time reports.
*/
type TimeReportService struct {
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	taskStore          store.TaskStore
}

/*
NewTimeReportService creates a time report service.
*/
func NewTimeReportService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	taskStore store.TaskStore,
) *TimeReportService {
	return &TimeReportService{
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		taskStore:          taskStore,
	}
}

/*
GetSummary returns an aggregated workspace time report.
*/
func (s *TimeReportService) GetSummary(
	ctx context.Context,
	input GetTimeReportSummaryInput,
) (*domain.TimeReportSummary, error) {
	workspaceID, startDate, endDate, err := s.validateTimeReportRequest(
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

	groupBy := domain.TimeReportGroupBy(strings.TrimSpace(input.GroupBy))
	if groupBy == "" {
		groupBy = domain.TimeReportGroupByPerson
	}

	if !groupBy.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Time report grouping is not supported.")
	}

	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries.")
	}

	tasks, err := s.taskStore.ListTasksByWorkspaceID(ctx, workspaceID, true)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load tasks for time report.")
	}

	tasksByID := indexTimeReportTasks(tasks)
	summary := buildTimeReportSummary(workspaceID, startDate, endDate, groupBy, entries, tasksByID)

	return summary, nil
}

/*
validateTimeReportRequest validates filters and permissions.
*/
func (s *TimeReportService) validateTimeReportRequest(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceIDValue string,
	startDateValue string,
	endDateValue string,
) (domain.ID, domain.LocalDate, domain.LocalDate, error) {
	cleanActorUserID := strings.TrimSpace(actorUserID)
	if cleanActorUserID == "" {
		return "", "", "", NewError(ErrorCodePermissionDenied, "You must be signed in to view time reports.")
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

	if err := s.requireTimeReportPermission(ctx, cleanActorUserID, isSystemAdmin, workspaceID); err != nil {
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
requireTimeReportPermission verifies that an actor can view workspace time reports.
*/
func (s *TimeReportService) requireTimeReportPermission(
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
		return NewError(ErrorCodeInternal, "Could not verify time report permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Viewers, Admins, and System Admins can view time reports.")
	}

	return nil
}

/*
indexTimeReportTasks returns tasks keyed by task ID.
*/
func indexTimeReportTasks(tasks []domain.Task) map[string]domain.Task {
	tasksByID := map[string]domain.Task{}

	for _, task := range tasks {
		tasksByID[task.ID.String()] = task
	}

	return tasksByID
}

/*
buildTimeReportSummary aggregates time entries.
*/
func buildTimeReportSummary(
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
	groupBy domain.TimeReportGroupBy,
	entries []domain.TimeEntry,
	tasksByID map[string]domain.Task,
) *domain.TimeReportSummary {
	rowsByKey := map[string]domain.TimeReportRow{}
	totalMinutes := 0

	for _, entry := range entries {
		rowKey, row := timeReportRowSeed(groupBy, entry, tasksByID)
		existingRow, exists := rowsByKey[rowKey]
		if !exists {
			existingRow = row
		}

		existingRow.Minutes += entry.Minutes
		existingRow.EntryCount++
		rowsByKey[rowKey] = existingRow
		totalMinutes += entry.Minutes
	}

	rows := make([]domain.TimeReportRow, 0, len(rowsByKey))
	for _, row := range rowsByKey {
		rows = append(rows, row)
	}

	sort.Slice(rows, func(firstIndex int, secondIndex int) bool {
		first := rows[firstIndex]
		second := rows[secondIndex]

		if first.Minutes == second.Minutes {
			return first.Label < second.Label
		}

		return first.Minutes > second.Minutes
	})

	return &domain.TimeReportSummary{
		WorkspaceID:  workspaceID,
		StartDate:    startDate,
		EndDate:      endDate,
		GroupBy:      groupBy,
		TotalMinutes: totalMinutes,
		Rows:         rows,
	}
}

/*
timeReportRowSeed creates the initial row for a time entry group.
*/
func timeReportRowSeed(
	groupBy domain.TimeReportGroupBy,
	entry domain.TimeEntry,
	tasksByID map[string]domain.Task,
) (string, domain.TimeReportRow) {
	switch groupBy {
	case domain.TimeReportGroupByTask:
		task := tasksByID[entry.TaskID.String()]
		label := firstNonEmptyTaskReportString(task.Title, entry.TaskID.String())

		return entry.TaskID.String(), domain.TimeReportRow{
			Key:    entry.TaskID.String(),
			Label:  label,
			TaskID: entry.TaskID,
		}

	case domain.TimeReportGroupByProject:
		key := firstNonEmptyTaskReportString(entry.ProjectID.String(), "none")
		label := key
		if key == "none" {
			label = "No project"
		}

		return key, domain.TimeReportRow{
			Key:       key,
			Label:     label,
			ProjectID: entry.ProjectID,
		}

	case domain.TimeReportGroupByCategory:
		key := firstNonEmptyTaskReportString(entry.CategoryID.String(), "none")
		label := key
		if key == "none" {
			label = "No category"
		}

		return key, domain.TimeReportRow{
			Key:        key,
			Label:      label,
			CategoryID: entry.CategoryID,
		}

	case domain.TimeReportGroupByDay:
		return entry.EntryDate.String(), domain.TimeReportRow{
			Key:         entry.EntryDate.String(),
			Label:       entry.EntryDate.String(),
			PeriodStart: entry.EntryDate,
			PeriodEnd:   entry.EntryDate,
		}

	case domain.TimeReportGroupByWeek:
		periodStart, periodEnd := weekRangeForLocalDate(entry.EntryDate)

		return periodStart.String(), domain.TimeReportRow{
			Key:         periodStart.String(),
			Label:       periodStart.String() + " → " + periodEnd.String(),
			PeriodStart: periodStart,
			PeriodEnd:   periodEnd,
		}

	case domain.TimeReportGroupByPerson:
		fallthrough

	default:
		return entry.UserID, domain.TimeReportRow{
			Key:    entry.UserID,
			Label:  entry.UserID,
			UserID: entry.UserID,
		}
	}
}

/*
weekRangeForLocalDate returns a Monday-to-Sunday week range for a local date.
*/
func weekRangeForLocalDate(localDate domain.LocalDate) (domain.LocalDate, domain.LocalDate) {
	parsed, err := time.Parse("2006-01-02", localDate.String())
	if err != nil {
		return localDate, localDate
	}

	weekday := int(parsed.Weekday())
	if weekday == 0 {
		weekday = 7
	}

	monday := parsed.AddDate(0, 0, 1-weekday)
	sunday := monday.AddDate(0, 0, 6)

	return domain.LocalDate(monday.Format("2006-01-02")), domain.LocalDate(sunday.Format("2006-01-02"))
}

/*
firstNonEmptyTaskReportString returns the first non-empty string.
*/
func firstNonEmptyTaskReportString(values ...string) string {
	for _, value := range values {
		cleanValue := strings.TrimSpace(value)
		if cleanValue != "" {
			return cleanValue
		}
	}

	return ""
}
