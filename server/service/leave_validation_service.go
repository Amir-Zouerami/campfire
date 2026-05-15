package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ValidateLeaveInput contains the leave request fields needed before persistence.
*/
type ValidateLeaveInput struct {
	ActorUserID  string
	WorkspaceID  string
	StartDate    string
	EndDate      string
	DurationMode string
	HalfDayPart  string
	StartTime    string
	EndTime      string
}

/*
LeaveValidationResult describes whether a leave request can proceed.
*/
type LeaveValidationResult struct {
	Valid bool
}

/*
LeaveValidationService owns pre-create leave request validation.
*/
type LeaveValidationService struct {
	globalSkipDateStore store.GlobalSkipDateStore
}

/*
NewLeaveValidationService creates a leave validation service.
*/
func NewLeaveValidationService(globalSkipDateStore store.GlobalSkipDateStore) *LeaveValidationService {
	return &LeaveValidationService{
		globalSkipDateStore: globalSkipDateStore,
	}
}

/*
ValidateForCreate validates a leave request before it is persisted or sent to approvers.

Global off-days block leave requests because users should not request or consume
leave on organization-wide holidays or off-days.
*/
func (s *LeaveValidationService) ValidateForCreate(
	ctx context.Context,
	input ValidateLeaveInput,
) (*LeaveValidationResult, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to request leave.")
	}

	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	startDateValue := domain.LocalDate(strings.TrimSpace(input.StartDate))
	startDate, err := parseLocalDate(startDateValue)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Start date must be a real YYYY-MM-DD calendar date.")
	}

	endDateValue := domain.LocalDate(strings.TrimSpace(input.EndDate))
	endDate, err := parseLocalDate(endDateValue)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "End date must be a real YYYY-MM-DD calendar date.")
	}

	if endDate.Before(startDate) {
		return nil, NewError(ErrorCodeValidationFailed, "End date must be on or after start date.")
	}

	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))
	if err := validateLeaveDurationFields(
		durationMode,
		strings.TrimSpace(input.HalfDayPart),
		strings.TrimSpace(input.StartTime),
		strings.TrimSpace(input.EndTime),
	); err != nil {
		return nil, err
	}

	offDays, err := s.globalSkipDateStore.ListBetween(ctx, startDateValue, endDateValue)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not validate global off-days.")
	}

	if len(offDays) > 0 {
		return nil, NewError(
			ErrorCodeValidationFailed,
			fmt.Sprintf(
				"Leave cannot be requested on global off-days: %s.",
				formatGlobalOffDays(offDays),
			),
		)
	}

	return &LeaveValidationResult{
		Valid: true,
	}, nil
}

/*
formatGlobalOffDays formats global off-days for validation messages.
*/
func formatGlobalOffDays(offDays []domain.GlobalSkipDate) string {
	parts := make([]string, 0, len(offDays))

	for _, offDay := range offDays {
		parts = append(parts, offDay.Date.String()+" ("+offDay.Label+")")
	}

	return strings.Join(parts, ", ")
}
