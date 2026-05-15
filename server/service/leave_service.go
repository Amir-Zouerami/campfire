package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
CreateLeaveInput contains user-submitted leave request data.
*/
type CreateLeaveInput struct {
	ActorUserID  string
	WorkspaceID  string
	LeaveTypeID  string
	StartDate    string
	EndDate      string
	DurationMode string
	HalfDayPart  string
	StartTime    string
	EndTime      string
	Reason       string
	BackupUserID string
}

/*
LeaveService owns leave request business rules.
*/
type LeaveService struct {
	leaveStore             store.LeaveStore
	leaveValidationService *LeaveValidationService
}

/*
NewLeaveService creates a leave service.
*/
func NewLeaveService(
	leaveStore store.LeaveStore,
	leaveValidationService *LeaveValidationService,
) *LeaveService {
	return &LeaveService{
		leaveStore:             leaveStore,
		leaveValidationService: leaveValidationService,
	}
}

/*
ListTypes returns active leave types for a workspace.
*/
func (s *LeaveService) ListTypes(
	ctx context.Context,
	actorUserID string,
	workspaceID string,
) ([]domain.LeaveType, error) {
	if strings.TrimSpace(actorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view leave types.")
	}

	cleanWorkspaceID := strings.TrimSpace(workspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	leaveTypes, err := s.leaveStore.ListTypesByWorkspaceID(ctx, domain.ID(cleanWorkspaceID))
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load leave types.")
	}

	return leaveTypes, nil
}

/*
Create validates and creates a pending leave request.

All Campfire default leave types require approval, so new requests start as
pending. Approver notifications are handled by the notification workflow layer.
*/
func (s *LeaveService) Create(ctx context.Context, input CreateLeaveInput) (*domain.LeaveRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to request leave.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	cleanLeaveTypeID := strings.TrimSpace(input.LeaveTypeID)
	if cleanLeaveTypeID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Leave type is required.")
	}

	_, err := s.leaveStore.GetActiveTypeByID(ctx, domain.ID(cleanWorkspaceID), domain.ID(cleanLeaveTypeID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "Leave type is invalid for this workspace.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not validate leave type.")
	}

	validationResult, err := s.leaveValidationService.ValidateForCreate(ctx, ValidateLeaveInput{
		ActorUserID:  cleanActorUserID,
		WorkspaceID:  cleanWorkspaceID,
		StartDate:    input.StartDate,
		EndDate:      input.EndDate,
		DurationMode: input.DurationMode,
		HalfDayPart:  input.HalfDayPart,
		StartTime:    input.StartTime,
		EndTime:      input.EndTime,
	})
	if err != nil {
		return nil, err
	}

	if !validationResult.Valid {
		return nil, NewError(ErrorCodeValidationFailed, "Leave request is invalid.")
	}

	startDate := domain.LocalDate(strings.TrimSpace(input.StartDate))
	endDate := domain.LocalDate(strings.TrimSpace(input.EndDate))
	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))

	now := time.Now().UTC()

	leaveRequest := domain.LeaveRequest{
		ID:           domain.ID(uuid.NewString()),
		WorkspaceID:  domain.ID(cleanWorkspaceID),
		UserID:       cleanActorUserID,
		LeaveTypeID:  domain.ID(cleanLeaveTypeID),
		StartDate:    startDate,
		EndDate:      endDate,
		DurationMode: durationMode,
		HalfDayPart:  domain.LeaveHalfDayPart(strings.TrimSpace(input.HalfDayPart)),
		StartTime:    domain.TimeOfDay(strings.TrimSpace(input.StartTime)),
		EndTime:      domain.TimeOfDay(strings.TrimSpace(input.EndTime)),
		Reason:       strings.TrimSpace(input.Reason),
		BackupUserID: strings.TrimSpace(input.BackupUserID),
		Status:       domain.LeaveStatusPending,
		CreatedAt:    now,
		UpdatedAt:    now,
		CancelledAt:  nil,
	}

	created, err := s.leaveStore.CreateRequest(ctx, leaveRequest)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create leave request.")
	}

	return created, nil
}

/*
validateLeaveDurationFields validates mode-specific leave fields.
*/
func validateLeaveDurationFields(
	durationMode domain.LeaveDurationMode,
	halfDayPart string,
	startTime string,
	endTime string,
) error {
	if !durationMode.IsValid() {
		return NewError(ErrorCodeValidationFailed, "Leave duration mode is invalid.")
	}

	switch durationMode {
	case domain.LeaveDurationFullDay:
		return nil

	case domain.LeaveDurationHalfDay:
		part := domain.LeaveHalfDayPart(strings.TrimSpace(halfDayPart))
		if !isValidHalfDayPart(part) {
			return NewError(ErrorCodeValidationFailed, "Half-day leave must specify morning or afternoon.")
		}

		return nil

	case domain.LeaveDurationHourly:
		cleanStartTime := domain.TimeOfDay(strings.TrimSpace(startTime))
		cleanEndTime := domain.TimeOfDay(strings.TrimSpace(endTime))

		if !isValidTimeOfDay(cleanStartTime) || !isValidTimeOfDay(cleanEndTime) {
			return NewError(ErrorCodeValidationFailed, "Hourly leave must include valid HH:mm start and end times.")
		}

		if cleanStartTime.String() >= cleanEndTime.String() {
			return NewError(ErrorCodeValidationFailed, "Hourly leave end time must be after start time.")
		}

		return nil

	default:
		return NewError(ErrorCodeValidationFailed, "Leave duration mode is invalid.")
	}
}

/*
parseLocalDate parses and validates a YYYY-MM-DD local date.
*/
func parseLocalDate(value domain.LocalDate) (time.Time, error) {
	if !value.IsValid() {
		return time.Time{}, NewError(ErrorCodeValidationFailed, "Date must use YYYY-MM-DD format.")
	}

	parsed, err := time.Parse(localDateLayout, value.String())
	if err != nil {
		return time.Time{}, NewError(ErrorCodeValidationFailed, "Date must be a real calendar date.")
	}

	return parsed, nil
}

/*
isValidTimeOfDay returns true for an HH:mm local time string.
*/
func isValidTimeOfDay(value domain.TimeOfDay) bool {
	if len(value.String()) != 5 {
		return false
	}

	_, err := time.Parse("15:04", value.String())

	return err == nil
}

/*
isValidHalfDayPart returns true when the half-day part is supported.
*/
func isValidHalfDayPart(part domain.LeaveHalfDayPart) bool {
	switch part {
	case domain.LeaveHalfDayMorning, domain.LeaveHalfDayAfternoon:
		return true
	default:
		return false
	}
}

const localDateLayout = "2006-01-02"
