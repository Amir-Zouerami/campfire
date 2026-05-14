package service

import (
	"context"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ValidateLeaveRequestInput contains leave fields that must be checked before a
leave request can be created.
*/
type ValidateLeaveRequestInput struct {
	ActorUserID string

	WorkspaceID string

	StartDate string
	EndDate   string

	DurationMode string
	HalfDayPart  string

	StartTime string
	EndTime   string
}

/*
ValidateLeaveRequestResult describes whether a leave request is currently allowed.
*/
type ValidateLeaveRequestResult struct {
	Allowed bool
	Message string

	GlobalSkipDates []domain.GlobalSkipDate
}

/*
LeaveService owns leave workflow business rules.
*/
type LeaveService struct {
	globalSkipDateStore store.GlobalSkipDateStore
}

/*
NewLeaveService creates a leave service.
*/
func NewLeaveService(globalSkipDateStore store.GlobalSkipDateStore) *LeaveService {
	return &LeaveService{
		globalSkipDateStore: globalSkipDateStore,
	}
}

/*
ValidateRequest validates a leave request before creation.

This does not persist a leave request. Full create/approval workflows will call
this validation before notifying approvers.
*/
func (s *LeaveService) ValidateRequest(
	ctx context.Context,
	input ValidateLeaveRequestInput,
) (*ValidateLeaveRequestResult, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to request leave.")
	}

	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	startDate, endDate, err := validateLeaveDateRange(input.StartDate, input.EndDate)
	if err != nil {
		return nil, err
	}

	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))
	if !durationMode.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Leave duration mode is invalid.")
	}

	if err := validateLeaveDurationFields(durationMode, input.HalfDayPart, input.StartTime, input.EndTime); err != nil {
		return nil, err
	}

	globalSkipDates, err := s.globalSkipDateStore.ListBetween(ctx, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not validate global off-days.")
	}

	if len(globalSkipDates) > 0 {
		return &ValidateLeaveRequestResult{
			Allowed:         false,
			Message:         "Leave cannot be requested on global holidays or off-days.",
			GlobalSkipDates: globalSkipDates,
		}, nil
	}

	return &ValidateLeaveRequestResult{
		Allowed:         true,
		Message:         "Leave request is valid.",
		GlobalSkipDates: []domain.GlobalSkipDate{},
	}, nil
}

/*
validateLeaveDateRange validates and returns parsed local date strings.
*/
func validateLeaveDateRange(startDateValue string, endDateValue string) (domain.LocalDate, domain.LocalDate, error) {
	startDate := domain.LocalDate(strings.TrimSpace(startDateValue))
	if !startDate.IsValid() {
		return "", "", NewError(ErrorCodeValidationFailed, "Start date must use YYYY-MM-DD format.")
	}

	endDate := domain.LocalDate(strings.TrimSpace(endDateValue))
	if !endDate.IsValid() {
		return "", "", NewError(ErrorCodeValidationFailed, "End date must use YYYY-MM-DD format.")
	}

	parsedStartDate, err := parseLocalDate(startDate)
	if err != nil {
		return "", "", NewError(ErrorCodeValidationFailed, "Start date must be a real calendar date.")
	}

	parsedEndDate, err := parseLocalDate(endDate)
	if err != nil {
		return "", "", NewError(ErrorCodeValidationFailed, "End date must be a real calendar date.")
	}

	if parsedEndDate.Before(parsedStartDate) {
		return "", "", NewError(ErrorCodeValidationFailed, "End date cannot be before start date.")
	}

	return startDate, endDate, nil
}

/*
validateLeaveDurationFields validates duration-mode-specific leave fields.
*/
func validateLeaveDurationFields(
	durationMode domain.LeaveDurationMode,
	halfDayPartValue string,
	startTimeValue string,
	endTimeValue string,
) error {
	switch durationMode {
	case domain.LeaveDurationFullDay:
		return nil

	case domain.LeaveDurationHalfDay:
		halfDayPart := domain.LeaveHalfDayPart(strings.TrimSpace(halfDayPartValue))
		if halfDayPart != domain.LeaveHalfDayMorning && halfDayPart != domain.LeaveHalfDayAfternoon {
			return NewError(ErrorCodeValidationFailed, "Half-day leave must be morning or afternoon.")
		}

		return nil

	case domain.LeaveDurationHourly:
		startTime := domain.TimeOfDay(strings.TrimSpace(startTimeValue))
		endTime := domain.TimeOfDay(strings.TrimSpace(endTimeValue))

		if !isValidTimeOfDay(startTime) {
			return NewError(ErrorCodeValidationFailed, "Hourly leave start time must use HH:mm format.")
		}

		if !isValidTimeOfDay(endTime) {
			return NewError(ErrorCodeValidationFailed, "Hourly leave end time must use HH:mm format.")
		}

		if !isEndTimeAfterStartTime(startTime, endTime) {
			return NewError(ErrorCodeValidationFailed, "Hourly leave end time must be after start time.")
		}

		return nil

	default:
		return NewError(ErrorCodeValidationFailed, "Leave duration mode is invalid.")
	}
}

/*
parseLocalDate parses a YYYY-MM-DD local date.
*/
func parseLocalDate(value domain.LocalDate) (time.Time, error) {
	return time.Parse("2006-01-02", value.String())
}

/*
isValidTimeOfDay returns true when a time string is valid HH:mm.
*/
func isValidTimeOfDay(value domain.TimeOfDay) bool {
	_, err := time.Parse("15:04", value.String())
	return err == nil
}

/*
isEndTimeAfterStartTime returns true when the end time is after the start time.
*/
func isEndTimeAfterStartTime(startTime domain.TimeOfDay, endTime domain.TimeOfDay) bool {
	parsedStartTime, startErr := time.Parse("15:04", startTime.String())
	if startErr != nil {
		return false
	}

	parsedEndTime, endErr := time.Parse("15:04", endTime.String())
	if endErr != nil {
		return false
	}

	return parsedEndTime.After(parsedStartTime)
}
