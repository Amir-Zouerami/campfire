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
ListPendingLeavesInput contains pending leave list filters.
*/
type ListPendingLeavesInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
}

/*
ListMyPendingLeavesInput contains current-user pending leave list filters.
*/
type ListMyPendingLeavesInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
DecideLeaveInput contains user-submitted leave decision data.
*/
type DecideLeaveInput struct {
	ActorUserID    string
	IsSystemAdmin  bool
	LeaveRequestID string
	Decision       string
	Comment        string
}

/*
CancelLeaveInput contains data needed to cancel a pending leave request.
*/
type CancelLeaveInput struct {
	ActorUserID    string
	LeaveRequestID string
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
ListPending returns pending leave requests for workspace approvers.
*/
func (s *LeaveService) ListPending(
	ctx context.Context,
	input ListPendingLeavesInput,
) ([]domain.LeaveRequestWithType, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view pending leave requests.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if err := s.requireLeaveDecisionPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	leaveRequests, err := s.leaveStore.ListPendingByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load pending leave requests.")
	}

	return leaveRequests, nil
}

/*
ListMyPending returns pending leave requests created by the current user.
*/
func (s *LeaveService) ListMyPending(
	ctx context.Context,
	input ListMyPendingLeavesInput,
) ([]domain.LeaveRequestWithType, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view your leave requests.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	leaveRequests, err := s.leaveStore.ListPendingByWorkspaceIDAndUserID(
		ctx,
		domain.ID(cleanWorkspaceID),
		cleanActorUserID,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load your pending leave requests.")
	}

	return leaveRequests, nil
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
Decide approves or rejects a pending leave request.
*/
func (s *LeaveService) Decide(ctx context.Context, input DecideLeaveInput) (*domain.LeaveRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to decide leave requests.")
	}

	cleanLeaveRequestID := strings.TrimSpace(input.LeaveRequestID)
	if cleanLeaveRequestID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Leave request ID is required.")
	}

	decisionStatus := domain.LeaveStatus(strings.TrimSpace(input.Decision))
	if decisionStatus != domain.LeaveStatusApproved && decisionStatus != domain.LeaveStatusRejected {
		return nil, NewError(ErrorCodeValidationFailed, "Decision must be approved or rejected.")
	}

	existingRequest, err := s.leaveStore.GetRequestByID(ctx, domain.ID(cleanLeaveRequestID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Leave request was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load leave request.")
	}

	if existingRequest.Status != domain.LeaveStatusPending {
		return nil, NewError(ErrorCodeConflict, "Only pending leave requests can be approved or rejected.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, existingRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireLeaveDecisionPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspace.ID); err != nil {
		return nil, err
	}

	leaveType, err := s.leaveStore.GetActiveTypeByID(ctx, workspace.ID, existingRequest.LeaveTypeID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "Leave type is no longer active.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load leave type.")
	}

	now := time.Now().UTC()
	decision := domain.LeaveDecision{
		ID:             domain.ID(uuid.NewString()),
		LeaveRequestID: existingRequest.ID,
		WorkspaceID:    workspace.ID,
		DecidedBy:      cleanActorUserID,
		Decision:       decisionStatus,
		Comment:        strings.TrimSpace(input.Comment),
		CreatedAt:      now,
	}

	decidedRequest, err := s.leaveStore.DecideRequest(ctx, store.DecideLeaveRequestParams{
		LeaveRequestID: existingRequest.ID,
		NewStatus:      decisionStatus,
		Decision:       decision,
		UpdatedAt:      now,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "Only pending leave requests can be approved or rejected.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update leave request.")
	}

	_ = s.notificationPublisher.NotifyLeaveDecided(ctx, LeaveDecisionNotification{
		LeaveRequestID: decidedRequest.ID.String(),
		WorkspaceID:    workspace.ID.String(),
		WorkspaceName:  workspace.Name,
		ChannelID:      workspace.ChannelID,

		RequesterUserID: decidedRequest.UserID,
		DeciderUserID:   cleanActorUserID,

		LeaveTypeName: leaveType.Name,
		StartDate:     decidedRequest.StartDate.String(),
		EndDate:       decidedRequest.EndDate.String(),
		DurationMode:  string(decidedRequest.DurationMode),
		HalfDayPart:   string(decidedRequest.HalfDayPart),
		StartTime:     decidedRequest.StartTime.String(),
		EndTime:       decidedRequest.EndTime.String(),
		Decision:      string(decisionStatus),
		Comment:       decision.Comment,
	})

	return decidedRequest, nil
}

/*
Cancel cancels a pending leave request created by the current user.
*/
func (s *LeaveService) Cancel(ctx context.Context, input CancelLeaveInput) (*domain.LeaveRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to cancel leave requests.")
	}

	cleanLeaveRequestID := strings.TrimSpace(input.LeaveRequestID)
	if cleanLeaveRequestID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Leave request ID is required.")
	}

	existingRequest, err := s.leaveStore.GetRequestByID(ctx, domain.ID(cleanLeaveRequestID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Leave request was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load leave request.")
	}

	if existingRequest.UserID != cleanActorUserID {
		return nil, NewError(ErrorCodePermissionDenied, "Only the requester can cancel this leave request.")
	}

	if existingRequest.Status != domain.LeaveStatusPending {
		return nil, NewError(ErrorCodeConflict, "Only pending leave requests can be cancelled.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, existingRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	leaveType, err := s.leaveStore.GetActiveTypeByID(ctx, workspace.ID, existingRequest.LeaveTypeID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "Leave type is no longer active.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load leave type.")
	}

	now := time.Now().UTC()
	cancelledRequest, err := s.leaveStore.CancelRequest(ctx, store.CancelLeaveRequestParams{
		LeaveRequestID: existingRequest.ID,
		CancelledAt:    now,
		UpdatedAt:      now,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "Only pending leave requests can be cancelled.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not cancel leave request.")
	}

	approverUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(
		ctx,
		workspace.ID,
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveCancelled(ctx, LeaveCancellationNotification{
			LeaveRequestID: cancelledRequest.ID.String(),
			WorkspaceID:    workspace.ID.String(),
			WorkspaceName:  workspace.Name,
			ChannelID:      workspace.ChannelID,

			RequesterUserID: cleanActorUserID,
			ApproverUserIDs: filterNotificationRecipients(approverUserIDs, cleanActorUserID),

			LeaveTypeName: leaveType.Name,
			StartDate:     cancelledRequest.StartDate.String(),
			EndDate:       cancelledRequest.EndDate.String(),
			DurationMode:  string(cancelledRequest.DurationMode),
			HalfDayPart:   string(cancelledRequest.HalfDayPart),
			StartTime:     cancelledRequest.StartTime.String(),
			EndTime:       cancelledRequest.EndTime.String(),
			Status:        string(cancelledRequest.Status),
		})
	}

	return cancelledRequest, nil
}

/*
requireLeaveDecisionPermission ensures the actor can approve or reject leave.
*/
func (s *LeaveService) requireLeaveDecisionPermission(
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
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify leave approval permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads and Approvers can decide leave requests.")
	}

	return nil
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
