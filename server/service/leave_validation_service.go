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

Warnings are user-safe messages that explain why a pre-validation request is not
valid without forcing the UI to parse raw service errors.
*/
type LeaveValidationResult struct {
	Valid    bool
	Warnings []string
}

/*
FirstWarning returns the first validation warning when one exists.
*/
func (r LeaveValidationResult) FirstWarning() string {
	if len(r.Warnings) == 0 {
		return ""
	}

	return r.Warnings[0]
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
leave on organization-wide holidays or off-days. Calendar-blocking validation is
returned as a structured invalid result so the frontend can render the warning
inline without showing raw technical API errors.
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
		return &LeaveValidationResult{
			Valid: false,
			Warnings: []string{
				fmt.Sprintf(
					"Leave cannot be requested on global off-days: %s.",
					formatGlobalOffDays(offDays),
				),
			},
		}, nil
	}

	return &LeaveValidationResult{
		Valid:    true,
		Warnings: []string{},
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
