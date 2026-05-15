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
	workspaceStore         store.WorkspaceStore
	workspaceRoleStore     store.WorkspaceRoleStore
	notificationPublisher  NotificationPublisher
}

/*
NewLeaveService creates a leave service.
*/
func NewLeaveService(
	leaveStore store.LeaveStore,
	leaveValidationService *LeaveValidationService,
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	notificationPublisher NotificationPublisher,
) *LeaveService {
	return &LeaveService{
		leaveStore:             leaveStore,
		leaveValidationService: leaveValidationService,
		workspaceStore:         workspaceStore,
		workspaceRoleStore:     workspaceRoleStore,
		notificationPublisher:  notificationPublisher,
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
pending. Approver notifications are sent after persistence using the
NotificationPublisher port.
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

	workspace, err := s.workspaceStore.GetByID(ctx, domain.ID(cleanWorkspaceID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	leaveType, err := s.leaveStore.GetActiveTypeByID(ctx, domain.ID(cleanWorkspaceID), domain.ID(cleanLeaveTypeID))
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

	approverUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(
		ctx,
		domain.ID(cleanWorkspaceID),
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveRequested(ctx, LeaveRequestNotification{
			LeaveRequestID: created.ID.String(),
			WorkspaceID:    workspace.ID.String(),
			WorkspaceName:  workspace.Name,
			ChannelID:      workspace.ChannelID,

			RequesterUserID: cleanActorUserID,
			ApproverUserIDs: filterNotificationRecipients(approverUserIDs, cleanActorUserID),

			LeaveTypeName: leaveType.Name,
			StartDate:     created.StartDate.String(),
			EndDate:       created.EndDate.String(),
			DurationMode:  string(created.DurationMode),
			HalfDayPart:   string(created.HalfDayPart),
			StartTime:     created.StartTime.String(),
			EndTime:       created.EndTime.String(),
			Reason:        created.Reason,
			BackupUserID:  created.BackupUserID,
			Status:        string(created.Status),
		})
	}

	return created, nil
}

/*
filterNotificationRecipients removes empty IDs, duplicates, and the requester.

The requester should not receive an approver notification for their own leave
request.
*/
func filterNotificationRecipients(userIDs []string, requesterUserID string) []string {
	recipients := make([]string, 0, len(userIDs))
	seen := map[string]bool{}
	cleanRequesterID := strings.TrimSpace(requesterUserID)

	for _, userID := range userIDs {
		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" || cleanUserID == cleanRequesterID || seen[cleanUserID] {
			continue
		}

		recipients = append(recipients, cleanUserID)
		seen[cleanUserID] = true
	}

	return recipients
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
