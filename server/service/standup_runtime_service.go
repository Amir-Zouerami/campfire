package service

import (
	"context"
	"errors"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
EvaluateStandupDayInput contains fields needed to evaluate standup runtime behavior.
*/
type EvaluateStandupDayInput struct {
	ActorUserID string
	WorkspaceID string
	Date        string
}

/*
StandupRuntimeService decides whether standup automation should run for dates.
*/
type StandupRuntimeService struct {
	workspaceStore         store.WorkspaceStore
	workspaceCalendarStore store.WorkspaceCalendarStore
	globalSkipDateStore    store.GlobalSkipDateStore
	leaveStore             store.LeaveStore
	memberProvider         WorkspaceMemberProvider
}

/*
NewStandupRuntimeService creates a standup runtime service.
*/
func NewStandupRuntimeService(
	workspaceStore store.WorkspaceStore,
	workspaceCalendarStore store.WorkspaceCalendarStore,
	globalSkipDateStore store.GlobalSkipDateStore,
	leaveStore store.LeaveStore,
	memberProvider WorkspaceMemberProvider,
) *StandupRuntimeService {
	return &StandupRuntimeService{
		workspaceStore:         workspaceStore,
		workspaceCalendarStore: workspaceCalendarStore,
		globalSkipDateStore:    globalSkipDateStore,
		leaveStore:             leaveStore,
		memberProvider:         memberProvider,
	}
}

/*
EvaluateDay returns whether Campfire should run standup automation for a workspace date.
*/
func (s *StandupRuntimeService) EvaluateDay(
	ctx context.Context,
	input EvaluateStandupDayInput,
) (*domain.StandupRunDecision, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to evaluate standup runtime.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	dateValue := domain.LocalDate(strings.TrimSpace(input.Date))
	date, err := parseLocalDate(dateValue)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Date must be a real YYYY-MM-DD calendar date.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, domain.ID(cleanWorkspaceID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	isWorkingDay, err := s.workspaceCalendarStore.IsWorkingDay(ctx, workspace.ID, int(date.Weekday()))
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not evaluate workspace working day.")
	}

	globalOffDays, err := s.globalSkipDateStore.ListBetween(ctx, dateValue, dateValue)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not evaluate global off-days.")
	}

	workspaceOffDays, err := s.workspaceCalendarStore.ListOffDaysBetween(ctx, workspace.ID, dateValue, dateValue)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not evaluate workspace off-days.")
	}

	approvedLeaves, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspace.ID, dateValue, dateValue)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not evaluate approved leave.")
	}

	memberUserIDs, err := s.memberProvider.ListWorkspaceMemberUserIDs(ctx, *workspace)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not evaluate workspace members.")
	}

	return buildStandupRunDecision(
		workspace.ID,
		dateValue,
		isWorkingDay,
		globalOffDays,
		workspaceOffDays,
		approvedLeaves,
		memberUserIDs,
	), nil
}

/*
buildStandupRunDecision builds a run decision from evaluated runtime inputs.
*/
func buildStandupRunDecision(
	workspaceID domain.ID,
	date domain.LocalDate,
	isWorkingDay bool,
	globalOffDays []domain.GlobalSkipDate,
	workspaceOffDays []domain.WorkspaceOffDay,
	approvedLeaves []domain.LeaveRequestWithType,
	memberUserIDs []string,
) *domain.StandupRunDecision {
	memberIDs := uniqueNonEmptyStrings(memberUserIDs)
	onLeaveUserIDs := approvedLeaveUserIDSet(approvedLeaves)
	onLeaveMemberCount := countOnLeaveMembers(memberIDs, onLeaveUserIDs)

	decision := &domain.StandupRunDecision{
		WorkspaceID: workspaceID,
		Date:        date,

		ShouldRun: true,
		Reason:    domain.StandupSkipReasonNone,
		Message:   "Standup should run for this date.",

		IsWorkingDay:       isWorkingDay,
		MemberCount:        len(memberIDs),
		OnLeaveMemberCount: onLeaveMemberCount,

		GlobalOffDays:    globalOffDays,
		WorkspaceOffDays: workspaceOffDays,
		ApprovedLeaves:   approvedLeaves,
	}

	if !isWorkingDay {
		decision.ShouldRun = false
		decision.Reason = domain.StandupSkipReasonNonWorkingDay
		decision.Message = "Standup should not run because this is not a workspace working day."

		return decision
	}

	if len(globalOffDays) > 0 {
		decision.ShouldRun = false
		decision.Reason = domain.StandupSkipReasonGlobalOffDay
		decision.Message = "Standup should not run because this date is a global Campfire off-day."

		return decision
	}

	if len(workspaceOffDays) > 0 {
		decision.ShouldRun = false
		decision.Reason = domain.StandupSkipReasonWorkspaceOffDay
		decision.Message = "Standup should not run because this date is a workspace off-day."

		return decision
	}

	if len(memberIDs) > 0 && onLeaveMemberCount == len(memberIDs) {
		decision.ShouldRun = false
		decision.Reason = domain.StandupSkipReasonEveryoneOnLeave
		decision.Message = "Standup should not run because every current workspace channel member is on approved leave."

		return decision
	}

	return decision
}

/*
approvedLeaveUserIDSet returns the set of users with approved leave.
*/
func approvedLeaveUserIDSet(approvedLeaves []domain.LeaveRequestWithType) map[string]bool {
	userIDs := map[string]bool{}

	for _, leave := range approvedLeaves {
		cleanUserID := strings.TrimSpace(leave.LeaveRequest.UserID)
		if cleanUserID != "" {
			userIDs[cleanUserID] = true
		}
	}

	return userIDs
}

/*
countOnLeaveMembers counts workspace members who are on approved leave.
*/
func countOnLeaveMembers(memberUserIDs []string, onLeaveUserIDs map[string]bool) int {
	count := 0

	for _, userID := range memberUserIDs {
		if onLeaveUserIDs[userID] {
			count++
		}
	}

	return count
}

/*
uniqueNonEmptyStrings returns unique non-empty strings preserving first-seen order.
*/
func uniqueNonEmptyStrings(values []string) []string {
	results := make([]string, 0, len(values))
	seen := map[string]bool{}

	for _, value := range values {
		cleanValue := strings.TrimSpace(value)
		if cleanValue == "" || seen[cleanValue] {
			continue
		}

		seen[cleanValue] = true
		results = append(results, cleanValue)
	}

	return results
}
