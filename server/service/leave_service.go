package service

import (
	"context"
	"errors"
	"fmt"
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
	ActorUserID        string
	WorkspaceID        string
	LeaveTypeID        string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	Reason             string
	BackupUserID       string
	CanContactIfNeeded bool
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
ListMyActiveLeavesInput contains current-user active leave list filters.
*/
type ListMyActiveLeavesInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
ListMyActive returns pending and approved leave requests created by the current user.

Cancelled and rejected requests are intentionally excluded from this active list
because this endpoint powers immediate user actions such as cancellation.
*/
func (s *LeaveService) ListMyActive(
	ctx context.Context,
	input ListMyActiveLeavesInput,
) ([]domain.LeaveRequestWithType, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view your leave requests.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	leaveRequests, err := s.leaveStore.ListActiveByWorkspaceIDAndUserID(
		ctx,
		workspaceID,
		cleanActorUserID,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load your active leave requests.")
	}

	return leaveRequests, nil
}

/*
ListApprovedLeavesInput contains approved leave calendar query filters.
*/
type ListApprovedLeavesInput struct {
	ActorUserID string
	WorkspaceID string
	StartDate   string
	EndDate     string
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
CancelLeaveInput contains data needed to cancel a pending or approved leave request.
*/
type CancelLeaveInput struct {
	ActorUserID    string
	IsSystemAdmin  bool
	LeaveRequestID string
}

/*
UpdateLeaveInput contains approver-owned edits for a pending or approved leave request.
*/
type UpdateLeaveInput struct {
	ActorUserID        string
	IsSystemAdmin      bool
	LeaveRequestID     string
	LeaveTypeID        string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	Reason             string
	BackupUserID       string
	CanContactIfNeeded bool
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
ListApproved returns approved leave requests overlapping a date range.

Approved leave rows are used by the leave calendar, standup scheduling, and
future report generation.
*/
func (s *LeaveService) ListApproved(
	ctx context.Context,
	input ListApprovedLeavesInput,
) ([]domain.LeaveRequestWithType, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view approved leave.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
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

	leaveRequests, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(
		ctx,
		domain.ID(cleanWorkspaceID),
		startDateValue,
		endDateValue,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load approved leave.")
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
		warning := validationResult.FirstWarning()
		if warning == "" {
			warning = "Leave request is invalid."
		}

		return nil, NewError(ErrorCodeValidationFailed, warning)
	}

	startDate := domain.LocalDate(strings.TrimSpace(input.StartDate))
	endDate := domain.LocalDate(strings.TrimSpace(input.EndDate))
	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))

	activeLeaveRequests, err := s.leaveStore.ListActiveByWorkspaceIDAndUserID(
		ctx,
		domain.ID(cleanWorkspaceID),
		cleanActorUserID,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not check existing leave requests.")
	}

	for _, activeLeaveRequest := range activeLeaveRequests {
		if leaveDateRangesOverlap(startDate, endDate, activeLeaveRequest.LeaveRequest) {
			return nil, NewError(
				ErrorCodeConflict,
				"You already have a pending or approved leave request overlapping this date range. Cancel the existing request first.",
			)
		}
	}

	now := time.Now().UTC()

	leaveRequest := domain.LeaveRequest{
		ID:                 domain.ID(uuid.NewString()),
		WorkspaceID:        domain.ID(cleanWorkspaceID),
		UserID:             cleanActorUserID,
		LeaveTypeID:        domain.ID(cleanLeaveTypeID),
		StartDate:          startDate,
		EndDate:            endDate,
		DurationMode:       durationMode,
		HalfDayPart:        domain.LeaveHalfDayPart(strings.TrimSpace(input.HalfDayPart)),
		StartTime:          domain.TimeOfDay(strings.TrimSpace(input.StartTime)),
		EndTime:            domain.TimeOfDay(strings.TrimSpace(input.EndTime)),
		Reason:             strings.TrimSpace(input.Reason),
		BackupUserID:       strings.TrimSpace(input.BackupUserID),
		CanContactIfNeeded: input.CanContactIfNeeded,
		Status:             domain.LeaveStatusPending,
		CreatedAt:          now,
		UpdatedAt:          now,
		CancelledAt:        nil,
	}

	created, err := s.leaveStore.CreateRequest(ctx, leaveRequest)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create leave request.")
	}

	recipientUserIDs, err := s.leaveRequestNotificationRecipients(ctx, *workspace, cleanActorUserID)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveRequested(ctx, LeaveRequestNotification{
			LeaveRequestID: created.ID.String(),
			WorkspaceID:    workspace.ID.String(),
			WorkspaceName:  workspace.Name,
			ChannelID:      workspace.ChannelID,
			Language:       workspace.GeneratedMessageLanguage,

			RequesterUserID:  cleanActorUserID,
			RecipientUserIDs: recipientUserIDs,

			LeaveTypeName:      leaveType.Name,
			LeaveTypeCode:      leaveType.Code,
			StartDate:          created.StartDate.String(),
			EndDate:            created.EndDate.String(),
			DurationMode:       string(created.DurationMode),
			HalfDayPart:        string(created.HalfDayPart),
			StartTime:          created.StartTime.String(),
			EndTime:            created.EndTime.String(),
			Reason:             created.Reason,
			BackupUserID:       created.BackupUserID,
			CanContactIfNeeded: created.CanContactIfNeeded,
			Status:             string(created.Status),
		})
	}

	return created, nil
}

/*
Update applies an allowed correction to a pending or approved leave request.

Requesters may directly edit their own pending leave or approved leave that is
not currently in progress. Once approved leave is inside its active interval,
member edits must go through the change-request approval workflow. Leads,
approvers, and system admins keep direct correction access for operational fixes.
*/
func (s *LeaveService) Update(ctx context.Context, input UpdateLeaveInput) (*domain.LeaveRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to edit leave requests.")
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

	if existingRequest.Status != domain.LeaveStatusPending && existingRequest.Status != domain.LeaveStatusApproved {
		return nil, NewError(ErrorCodeConflict, "Only pending or approved leave requests can be edited.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, existingRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	actorCanManageLeave, err := s.canManageLeaveRequests(ctx, cleanActorUserID, input.IsSystemAdmin, workspace.ID)
	if err != nil {
		return nil, err
	}

	if existingRequest.UserID != cleanActorUserID && !actorCanManageLeave {
		return nil, NewError(ErrorCodePermissionDenied, "Only the requester, workspace Leads, Approvers, and system admins can edit this leave request.")
	}

	if existingRequest.UserID == cleanActorUserID && !actorCanManageLeave {
		requiresApproval, approvalErr := approvedLeaveIsInProgress(time.Now().UTC(), workspace.Timezone, *existingRequest)
		if approvalErr != nil {
			return nil, NewError(ErrorCodeInternal, "Could not validate leave edit window.")
		}

		if requiresApproval {
			return nil, NewError(ErrorCodeConflict, "Approved leave is already in progress. Request a leave edit instead of changing it directly.")
		}
	}

	cleanLeaveTypeID := strings.TrimSpace(input.LeaveTypeID)
	if cleanLeaveTypeID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Leave type is required.")
	}

	leaveType, err := s.leaveStore.GetActiveTypeByID(ctx, workspace.ID, domain.ID(cleanLeaveTypeID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "Leave type is invalid for this workspace.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not validate leave type.")
	}

	validationResult, err := s.leaveValidationService.ValidateForCreate(ctx, ValidateLeaveInput{
		ActorUserID:  cleanActorUserID,
		WorkspaceID:  workspace.ID.String(),
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
		warning := validationResult.FirstWarning()
		if warning == "" {
			warning = "Leave request is invalid."
		}

		return nil, NewError(ErrorCodeValidationFailed, warning)
	}

	startDate := domain.LocalDate(strings.TrimSpace(input.StartDate))
	endDate := domain.LocalDate(strings.TrimSpace(input.EndDate))
	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))

	activeLeaveRequests, err := s.leaveStore.ListActiveByWorkspaceIDAndUserID(ctx, workspace.ID, existingRequest.UserID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not check existing leave requests.")
	}

	for _, activeLeaveRequest := range activeLeaveRequests {
		if activeLeaveRequest.LeaveRequest.ID == existingRequest.ID {
			continue
		}

		if leaveDateRangesOverlap(startDate, endDate, activeLeaveRequest.LeaveRequest) {
			return nil, NewError(
				ErrorCodeConflict,
				"This edit overlaps another pending or approved leave request for the same user.",
			)
		}
	}

	now := time.Now().UTC()
	updatedRequest, err := s.leaveStore.UpdateRequest(ctx, store.UpdateLeaveRequestParams{
		LeaveRequestID:     existingRequest.ID,
		LeaveTypeID:        domain.ID(cleanLeaveTypeID),
		StartDate:          startDate,
		EndDate:            endDate,
		DurationMode:       durationMode,
		HalfDayPart:        domain.LeaveHalfDayPart(strings.TrimSpace(input.HalfDayPart)),
		StartTime:          domain.TimeOfDay(strings.TrimSpace(input.StartTime)),
		EndTime:            domain.TimeOfDay(strings.TrimSpace(input.EndTime)),
		Reason:             strings.TrimSpace(input.Reason),
		BackupUserID:       strings.TrimSpace(input.BackupUserID),
		CanContactIfNeeded: input.CanContactIfNeeded,
		UpdatedAt:          now,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "Only pending or approved leave requests can be edited.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not edit leave request.")
	}

	_ = s.notificationPublisher.NotifyLeaveUpdated(ctx, LeaveUpdatedNotification{
		LeaveRequestID: updatedRequest.ID.String(),
		WorkspaceID:    workspace.ID.String(),
		WorkspaceName:  workspace.Name,
		ChannelID:      workspace.ChannelID,
		Language:       workspace.GeneratedMessageLanguage,

		RequesterUserID: updatedRequest.UserID,
		EditorUserID:    cleanActorUserID,

		LeaveTypeName:      leaveType.Name,
		LeaveTypeCode:      leaveType.Code,
		StartDate:          updatedRequest.StartDate.String(),
		EndDate:            updatedRequest.EndDate.String(),
		DurationMode:       string(updatedRequest.DurationMode),
		HalfDayPart:        string(updatedRequest.HalfDayPart),
		StartTime:          updatedRequest.StartTime.String(),
		EndTime:            updatedRequest.EndTime.String(),
		CanContactIfNeeded: updatedRequest.CanContactIfNeeded,
	})

	return updatedRequest, nil
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
		Language:       workspace.GeneratedMessageLanguage,

		AnnouncementChannelID: workspace.ApprovedLeaveNotificationChannelID,

		RequesterUserID: decidedRequest.UserID,
		DeciderUserID:   cleanActorUserID,

		LeaveTypeName:      leaveType.Name,
		LeaveTypeCode:      leaveType.Code,
		StartDate:          decidedRequest.StartDate.String(),
		EndDate:            decidedRequest.EndDate.String(),
		DurationMode:       string(decidedRequest.DurationMode),
		HalfDayPart:        string(decidedRequest.HalfDayPart),
		StartTime:          decidedRequest.StartTime.String(),
		EndTime:            decidedRequest.EndTime.String(),
		CanContactIfNeeded: decidedRequest.CanContactIfNeeded,
		Decision:           string(decisionStatus),
		Comment:            decision.Comment,
	})

	return decidedRequest, nil
}

/*
Cancel cancels a pending or approved leave request created by the current user.

Pending cancellation removes the request from the approval queue. Approved
cancellation immediately removes the approved leave from availability, standup
missing-user checks, and approved-leave calendar queries because the request is
no longer approved after this operation.
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

	if existingRequest.Status != domain.LeaveStatusPending &&
		existingRequest.Status != domain.LeaveStatusApproved {
		return nil, NewError(ErrorCodeConflict, "Only pending or approved leave requests can be cancelled.")
	}

	wasApproved := existingRequest.Status == domain.LeaveStatusApproved

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
	actorCanManageLeave, err := s.canManageLeaveRequests(ctx, cleanActorUserID, input.IsSystemAdmin, workspace.ID)
	if err != nil {
		return nil, err
	}

	if existingRequest.UserID != cleanActorUserID && !actorCanManageLeave {
		return nil, NewError(ErrorCodePermissionDenied, "Only the requester, workspace Leads, Approvers, and system admins can cancel this leave request.")
	}

	if wasApproved && existingRequest.UserID == cleanActorUserID && !actorCanManageLeave {
		locked, lockErr := approvedLeaveIsInProgress(now, workspace.Timezone, *existingRequest)
		if lockErr != nil {
			return nil, NewError(ErrorCodeInternal, "Could not validate leave cancellation window.")
		}

		if locked {
			return nil, NewError(ErrorCodeConflict, "Approved leave is already in progress. Ask an approver to cancel it.")
		}
	}

	cancelledRequest, err := s.leaveStore.CancelRequest(ctx, store.CancelLeaveRequestParams{
		LeaveRequestID: existingRequest.ID,
		CancelledAt:    now,
		UpdatedAt:      now,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "Only pending or approved leave requests can be cancelled.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not cancel leave request.")
	}

	recipientUserIDs, err := s.leaveRequestNotificationRecipients(ctx, *workspace, existingRequest.UserID)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveCancelled(ctx, LeaveCancellationNotification{
			LeaveRequestID: cancelledRequest.ID.String(),
			WorkspaceID:    workspace.ID.String(),
			WorkspaceName:  workspace.Name,
			ChannelID:      workspace.ChannelID,
			Language:       workspace.GeneratedMessageLanguage,

			AnnouncementChannelID: workspace.ApprovedLeaveNotificationChannelID,

			RequesterUserID:  existingRequest.UserID,
			RecipientUserIDs: recipientUserIDs,

			LeaveTypeName:      leaveType.Name,
			LeaveTypeCode:      leaveType.Code,
			StartDate:          cancelledRequest.StartDate.String(),
			EndDate:            cancelledRequest.EndDate.String(),
			DurationMode:       string(cancelledRequest.DurationMode),
			HalfDayPart:        string(cancelledRequest.HalfDayPart),
			StartTime:          cancelledRequest.StartTime.String(),
			EndTime:            cancelledRequest.EndTime.String(),
			CanContactIfNeeded: cancelledRequest.CanContactIfNeeded,
			Status:             string(cancelledRequest.Status),
			WasApproved:        wasApproved,
		})
	}

	return cancelledRequest, nil
}

/*
approvedLeaveIsInProgress returns true only while approved leave currently
covers the workspace-local instant. Before the interval starts, members may
directly edit or cancel. During the interval, member edits must use the approval
workflow and member cancellation must be performed by an approver.
*/
func approvedLeaveIsInProgress(
	nowUTC time.Time,
	workspaceTimezone string,
	request domain.LeaveRequest,
) (bool, error) {
	if request.Status != domain.LeaveStatusApproved {
		return false, nil
	}

	startAt, endAt, err := leaveInterval(workspaceTimezone, request)
	if err != nil {
		return false, err
	}

	utcStart := startAt.UTC()
	utcEnd := endAt.UTC()

	return !nowUTC.Before(utcStart) && nowUTC.Before(utcEnd), nil
}

/*
leaveInterval returns the workspace-local start and exclusive end instants for a
leave request. Full-day requests end at midnight after the end date. Hourly
requests use their stored HH:mm range, and historical half-day rows keep their
old morning/afternoon semantics.
*/
func leaveInterval(workspaceTimezone string, request domain.LeaveRequest) (time.Time, time.Time, error) {
	cleanTimezone := strings.TrimSpace(workspaceTimezone)
	if cleanTimezone == "" {
		cleanTimezone = "UTC"
	}

	location, err := time.LoadLocation(cleanTimezone)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	startTimeOfDay := "00:00"
	endTimeOfDay := "00:00"
	endDate := request.EndDate.String()
	addEndDay := true

	switch request.DurationMode {
	case domain.LeaveDurationHourly:
		if strings.TrimSpace(request.StartTime.String()) != "" {
			startTimeOfDay = strings.TrimSpace(request.StartTime.String())
		}
		if strings.TrimSpace(request.EndTime.String()) != "" {
			endTimeOfDay = strings.TrimSpace(request.EndTime.String())
		}
		addEndDay = false

	case domain.LeaveDurationHalfDay:
		addEndDay = false
		if request.HalfDayPart == domain.LeaveHalfDayAfternoon {
			startTimeOfDay = "12:00"
			endTimeOfDay = "00:00"
			addEndDay = true
		} else {
			endTimeOfDay = "12:00"
		}
	}

	startAt, err := time.ParseInLocation(
		"2006-01-02 15:04",
		fmt.Sprintf("%s %s", request.StartDate.String(), startTimeOfDay),
		location,
	)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	endAt, err := time.ParseInLocation(
		"2006-01-02 15:04",
		fmt.Sprintf("%s %s", endDate, endTimeOfDay),
		location,
	)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	if addEndDay {
		endAt = endAt.AddDate(0, 0, 1)
	}

	return startAt, endAt, nil
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
canManageLeaveRequests reports whether the actor has operational leave authority.
*/
func (s *LeaveService) canManageLeaveRequests(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID domain.ID,
) (bool, error) {
	if isSystemAdmin {
		return true, nil
	}

	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspaceID,
		actorUserID,
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err != nil {
		return false, NewError(ErrorCodeInternal, "Could not verify leave management permission.")
	}

	return hasRole, nil
}

/*
normalizeLeaveNotificationLanguage returns a safe leave notification language.
*/
func normalizeLeaveNotificationLanguage(language domain.ReportLanguage) domain.ReportLanguage {
	switch language {
	case domain.ReportLanguagePersian:
		return domain.ReportLanguagePersian
	case domain.ReportLanguageArabic:
		return domain.ReportLanguageArabic
	default:
		return domain.ReportLanguageEnglish
	}
}

/*
leaveRequestNotificationRecipients returns the exact users who should receive
leave request direct-message notifications. Explicit workspace recipients take
precedence over role-derived recipients so technical leads can manage workspace
configuration without receiving operational leave-request DMs.
*/
func (s *LeaveService) leaveRequestNotificationRecipients(
	ctx context.Context,
	workspace domain.Workspace,
	requesterUserID string,
) ([]string, error) {
	if len(workspace.LeaveRequestNotificationRecipientIDs) > 0 {
		return filterNotificationRecipients(workspace.LeaveRequestNotificationRecipientIDs, requesterUserID), nil
	}

	roleRecipientUserIDs, err := s.workspaceRoleStore.ListUserIDsByRoles(
		ctx,
		workspace.ID,
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err != nil {
		return nil, err
	}

	return filterNotificationRecipients(roleRecipientUserIDs, requesterUserID), nil
}

/*
filterNotificationRecipients removes empty IDs, duplicates, and the requester.

The requester should not receive an approver notification for their own leave
request, even when they are configured as an explicit recipient.
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
leaveDateRangesOverlap returns whether a new request date range overlaps an existing request.

Leave overlap is intentionally date-level for now. A user cannot create multiple
pending/approved leave requests on the same date, even if one is half-day or hourly.
This keeps availability, reminders, and reporting unambiguous.
*/
func leaveDateRangesOverlap(startDate domain.LocalDate, endDate domain.LocalDate, existing domain.LeaveRequest) bool {
	return startDate.String() <= existing.EndDate.String() && endDate.String() >= existing.StartDate.String()
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
		return NewError(ErrorCodeValidationFailed, "Half-day leave is no longer supported. Use full-day or hourly leave.")

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
