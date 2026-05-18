package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
GetGlobalTimeReportSummaryInput contains global time report filters.
*/
type GetGlobalTimeReportSummaryInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	StartDate     string
	EndDate       string
	GroupBy       string
}

/*
GlobalTimeReportWorkspaceSummary contains one workspace total in a global time report.
*/
type GlobalTimeReportWorkspaceSummary struct {
	WorkspaceID   domain.ID
	WorkspaceName string
	TotalMinutes  int
	EntryCount    int
}

/*
GlobalTimeReportSummary contains global time report totals across workspaces.
*/
type GlobalTimeReportSummary struct {
	StartDate      domain.LocalDate
	EndDate        domain.LocalDate
	GroupBy        domain.TimeReportGroupBy
	WorkspaceCount int
	TotalMinutes   int
	EntryCount     int
	Rows           []domain.TimeReportRow
	Workspaces     []GlobalTimeReportWorkspaceSummary
}

/*
GlobalReportService builds reports that span all active Campfire workspaces.
*/
type GlobalReportService struct {
	workspaceStore        store.WorkspaceStore
	taskStore             store.TaskStore
	userDirectoryProvider UserDirectoryProvider
}

/*
NewGlobalReportService creates a global report service.
*/
func NewGlobalReportService(
	workspaceStore store.WorkspaceStore,
	taskStore store.TaskStore,
	userDirectoryProvider UserDirectoryProvider,
) *GlobalReportService {
	return &GlobalReportService{
		workspaceStore:        workspaceStore,
		taskStore:             taskStore,
		userDirectoryProvider: userDirectoryProvider,
	}
}

/*
GetGlobalTimeSummary returns a global aggregated time report.

MVP global reports are system-admin only. Global Viewer role can be added later
without changing the API contract.
*/
func (s *GlobalReportService) GetGlobalTimeSummary(
	ctx context.Context,
	input GetGlobalTimeReportSummaryInput,
) (*GlobalTimeReportSummary, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view global reports.")
	}

	if !input.IsSystemAdmin {
		return nil, NewError(ErrorCodePermissionDenied, "Only system admins can view global reports in this MVP.")
	}

	startDate, endDate, err := parseGlobalReportDateRange(input.StartDate, input.EndDate)
	if err != nil {
		return nil, err
	}

	groupBy := domain.TimeReportGroupBy(strings.TrimSpace(input.GroupBy))
	if groupBy == "" {
		groupBy = domain.TimeReportGroupByPerson
	}

	if !groupBy.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Global time report grouping is not supported.")
	}

	workspaces, err := s.workspaceStore.ListActive(ctx)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load active workspaces for global report.")
	}

	allEntries := []domain.TimeEntry{}
	allTasks := []domain.Task{}
	workspaceTotals := make([]GlobalTimeReportWorkspaceSummary, 0, len(workspaces))

	for _, workspace := range workspaces {
		entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspace.ID, startDate, endDate)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load global time entries.")
		}

		tasks, err := s.taskStore.ListTasksByWorkspaceID(ctx, workspace.ID, true)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load global time report tasks.")
		}

		totalMinutes := 0
		for _, entry := range entries {
			totalMinutes += entry.Minutes
		}

		workspaceTotals = append(workspaceTotals, GlobalTimeReportWorkspaceSummary{
			WorkspaceID:   workspace.ID,
			WorkspaceName: workspace.Name,
			TotalMinutes:  totalMinutes,
			EntryCount:    len(entries),
		})

		allEntries = append(allEntries, entries...)
		allTasks = append(allTasks, tasks...)
	}

	tasksByID := indexTimeReportTasks(allTasks)
	rows := buildGlobalTimeReportRows(groupBy, allEntries, tasksByID)

	if groupBy == domain.TimeReportGroupByPerson {
		applyGlobalTimeReportUserLabels(ctx, s.userDirectoryProvider, rows)
	}

	totalMinutes := 0
	for _, entry := range allEntries {
		totalMinutes += entry.Minutes
	}

	sort.SliceStable(workspaceTotals, func(firstIndex int, secondIndex int) bool {
		first := workspaceTotals[firstIndex]
		second := workspaceTotals[secondIndex]

		if first.TotalMinutes == second.TotalMinutes {
			return first.WorkspaceName < second.WorkspaceName
		}

		return first.TotalMinutes > second.TotalMinutes
	})

	return &GlobalTimeReportSummary{
		StartDate:      startDate,
		EndDate:        endDate,
		GroupBy:        groupBy,
		WorkspaceCount: len(workspaces),
		TotalMinutes:   totalMinutes,
		EntryCount:     len(allEntries),
		Rows:           rows,
		Workspaces:     workspaceTotals,
	}, nil
}

/*
buildGlobalTimeReportRows aggregates global time rows by the requested grouping.
*/
func buildGlobalTimeReportRows(
	groupBy domain.TimeReportGroupBy,
	entries []domain.TimeEntry,
	tasksByID map[string]domain.Task,
) []domain.TimeReportRow {
	rowsByKey := map[string]domain.TimeReportRow{}

	for _, entry := range entries {
		key, row := timeReportRowSeed(groupBy, entry, tasksByID)

		existing, exists := rowsByKey[key]
		if !exists {
			existing = row
		}

		existing.Minutes += entry.Minutes
		existing.EntryCount++
		rowsByKey[key] = existing
	}

	rows := make([]domain.TimeReportRow, 0, len(rowsByKey))
	for _, row := range rowsByKey {
		rows = append(rows, row)
	}

	sort.SliceStable(rows, func(firstIndex int, secondIndex int) bool {
		first := rows[firstIndex]
		second := rows[secondIndex]

		if first.Minutes == second.Minutes {
			return first.Label < second.Label
		}

		return first.Minutes > second.Minutes
	})

	return rows
}

/*
applyGlobalTimeReportUserLabels resolves person-grouped rows to readable names.
*/
func applyGlobalTimeReportUserLabels(
	ctx context.Context,
	userDirectoryProvider UserDirectoryProvider,
	rows []domain.TimeReportRow,
) {
	if userDirectoryProvider == nil || len(rows) == 0 {
		return
	}

	userIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		if strings.TrimSpace(row.UserID) != "" {
			userIDs = append(userIDs, row.UserID)
		}
	}

	profiles, err := userDirectoryProvider.GetUsersByIDs(ctx, normalizeUserIDs(userIDs))
	if err != nil {
		return
	}

	labels := map[string]string{}
	for _, profile := range profiles {
		cleanUserID := strings.TrimSpace(profile.ID)
		if cleanUserID == "" {
			continue
		}

		labels[cleanUserID] = globalReportUserProfileLabel(profile)
	}

	for index, row := range rows {
		label := strings.TrimSpace(labels[row.UserID])
		if label == "" {
			continue
		}

		row.Label = label
		rows[index] = row
	}
}

/*
globalReportUserProfileLabel returns the best readable label for one profile.
*/
func globalReportUserProfileLabel(profile UserProfile) string {
	displayName := strings.TrimSpace(profile.DisplayName)
	if displayName != "" {
		return displayName
	}

	username := strings.TrimSpace(profile.Username)
	if username != "" {
		return "@" + username
	}

	return strings.TrimSpace(profile.ID)
}

/*
parseGlobalReportDateRange validates a global report date range.
*/
func parseGlobalReportDateRange(
	startDateValue string,
	endDateValue string,
) (domain.LocalDate, domain.LocalDate, error) {
	startDate := domain.LocalDate(strings.TrimSpace(startDateValue))
	endDate := domain.LocalDate(strings.TrimSpace(endDateValue))

	if !startDate.IsValid() {
		return "", "", NewError(ErrorCodeValidationFailed, "Start date must use YYYY-MM-DD format.")
	}

	if !endDate.IsValid() {
		return "", "", NewError(ErrorCodeValidationFailed, "End date must use YYYY-MM-DD format.")
	}

	if _, err := time.Parse("2006-01-02", startDate.String()); err != nil {
		return "", "", NewError(ErrorCodeValidationFailed, "Start date is not a valid calendar date.")
	}

	if _, err := time.Parse("2006-01-02", endDate.String()); err != nil {
		return "", "", NewError(ErrorCodeValidationFailed, "End date is not a valid calendar date.")
	}

	if endDate.String() < startDate.String() {
		return "", "", NewError(ErrorCodeValidationFailed, "End date must be on or after start date.")
	}

	return startDate, endDate, nil
}
