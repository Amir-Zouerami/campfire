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
GetGlobalLeaveReportSummaryInput contains global leave report filters.
*/
type GetGlobalLeaveReportSummaryInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	StartDate     string
	EndDate       string
}

/*
GlobalLeaveReportRow contains one leave request plus its workspace display data.
*/
type GlobalLeaveReportRow struct {
	WorkspaceID   domain.ID
	WorkspaceName string
	Leave         domain.LeaveRequestWithType
}

/*
GlobalLeaveReportWorkspaceSummary contains leave totals for one workspace.
*/
type GlobalLeaveReportWorkspaceSummary struct {
	WorkspaceID   domain.ID
	WorkspaceName string
	ApprovedCount int
	PendingCount  int
}

/*
GlobalLeaveReportTypeSummary contains leave totals by leave type.
*/
type GlobalLeaveReportTypeSummary struct {
	LeaveTypeName  string
	LeaveTypeColor string
	ApprovedCount  int
	PendingCount   int
}

/*
GlobalLeaveReportSummary contains global leave totals across active workspaces.
*/
type GlobalLeaveReportSummary struct {
	StartDate      domain.LocalDate
	EndDate        domain.LocalDate
	WorkspaceCount int
	ApprovedCount  int
	PendingCount   int
	Rows           []GlobalLeaveReportRow
	Workspaces     []GlobalLeaveReportWorkspaceSummary
	Types          []GlobalLeaveReportTypeSummary
}

/*
GlobalLeaveReportService builds global leave reports.
*/
type GlobalLeaveReportService struct {
	workspaceStore store.WorkspaceStore
	leaveStore     store.LeaveStore
}

/*
NewGlobalLeaveReportService creates a global leave report service.
*/
func NewGlobalLeaveReportService(
	workspaceStore store.WorkspaceStore,
	leaveStore store.LeaveStore,
) *GlobalLeaveReportService {
	return &GlobalLeaveReportService{
		workspaceStore: workspaceStore,
		leaveStore:     leaveStore,
	}
}

/*
GetGlobalLeaveSummary returns a global leave dashboard summary.

MVP global leave reports are system-admin only.
*/
func (s *GlobalLeaveReportService) GetGlobalLeaveSummary(
	ctx context.Context,
	input GetGlobalLeaveReportSummaryInput,
) (*GlobalLeaveReportSummary, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view global leave reports.")
	}

	if !input.IsSystemAdmin {
		return nil, NewError(ErrorCodePermissionDenied, "Only system admins can view global leave reports in this MVP.")
	}

	startDate, endDate, err := parseGlobalLeaveReportDateRange(input.StartDate, input.EndDate)
	if err != nil {
		return nil, err
	}

	workspaces, err := s.workspaceStore.ListActive(ctx)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load active workspaces for global leave report.")
	}

	rows := []GlobalLeaveReportRow{}
	workspaceSummaries := make([]GlobalLeaveReportWorkspaceSummary, 0, len(workspaces))
	typeSummariesByName := map[string]GlobalLeaveReportTypeSummary{}

	for _, workspace := range workspaces {
		approvedLeaves, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspace.ID, startDate, endDate)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load approved leave requests for global report.")
		}

		pendingLeaves, err := s.leaveStore.ListPendingByWorkspaceID(ctx, workspace.ID)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load pending leave requests for global report.")
		}

		workspaceSummaries = append(workspaceSummaries, GlobalLeaveReportWorkspaceSummary{
			WorkspaceID:   workspace.ID,
			WorkspaceName: workspace.Name,
			ApprovedCount: len(approvedLeaves),
			PendingCount:  len(pendingLeaves),
		})

		for _, leave := range approvedLeaves {
			rows = append(rows, GlobalLeaveReportRow{
				WorkspaceID:   workspace.ID,
				WorkspaceName: workspace.Name,
				Leave:         leave,
			})

			typeSummary := typeSummariesByName[leave.LeaveTypeName]
			typeSummary.LeaveTypeName = leave.LeaveTypeName
			typeSummary.LeaveTypeColor = leave.LeaveTypeColor
			typeSummary.ApprovedCount++
			typeSummariesByName[leave.LeaveTypeName] = typeSummary
		}

		for _, leave := range pendingLeaves {
			rows = append(rows, GlobalLeaveReportRow{
				WorkspaceID:   workspace.ID,
				WorkspaceName: workspace.Name,
				Leave:         leave,
			})

			typeSummary := typeSummariesByName[leave.LeaveTypeName]
			typeSummary.LeaveTypeName = leave.LeaveTypeName
			typeSummary.LeaveTypeColor = leave.LeaveTypeColor
			typeSummary.PendingCount++
			typeSummariesByName[leave.LeaveTypeName] = typeSummary
		}
	}

	typeSummaries := make([]GlobalLeaveReportTypeSummary, 0, len(typeSummariesByName))
	for _, summary := range typeSummariesByName {
		typeSummaries = append(typeSummaries, summary)
	}

	sort.SliceStable(rows, func(firstIndex int, secondIndex int) bool {
		first := rows[firstIndex]
		second := rows[secondIndex]

		if first.Leave.LeaveRequest.StartDate == second.Leave.LeaveRequest.StartDate {
			return first.WorkspaceName < second.WorkspaceName
		}

		return first.Leave.LeaveRequest.StartDate.String() < second.Leave.LeaveRequest.StartDate.String()
	})

	sort.SliceStable(workspaceSummaries, func(firstIndex int, secondIndex int) bool {
		first := workspaceSummaries[firstIndex]
		second := workspaceSummaries[secondIndex]

		firstTotal := first.ApprovedCount + first.PendingCount
		secondTotal := second.ApprovedCount + second.PendingCount

		if firstTotal == secondTotal {
			return first.WorkspaceName < second.WorkspaceName
		}

		return firstTotal > secondTotal
	})

	sort.SliceStable(typeSummaries, func(firstIndex int, secondIndex int) bool {
		first := typeSummaries[firstIndex]
		second := typeSummaries[secondIndex]

		firstTotal := first.ApprovedCount + first.PendingCount
		secondTotal := second.ApprovedCount + second.PendingCount

		if firstTotal == secondTotal {
			return first.LeaveTypeName < second.LeaveTypeName
		}

		return firstTotal > secondTotal
	})

	approvedCount := 0
	pendingCount := 0
	for _, summary := range workspaceSummaries {
		approvedCount += summary.ApprovedCount
		pendingCount += summary.PendingCount
	}

	return &GlobalLeaveReportSummary{
		StartDate:      startDate,
		EndDate:        endDate,
		WorkspaceCount: len(workspaces),
		ApprovedCount:  approvedCount,
		PendingCount:   pendingCount,
		Rows:           rows,
		Workspaces:     workspaceSummaries,
		Types:          typeSummaries,
	}, nil
}

/*
parseGlobalLeaveReportDateRange validates a global leave report date range.
*/
func parseGlobalLeaveReportDateRange(
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
