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
ListPendingLeaveChangesInput contains pending leave edit request list filters.
*/
type ListPendingLeaveChangesInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
}

/*
RequestLeaveChangeInput contains member-proposed replacements for an existing leave request.
*/
type RequestLeaveChangeInput struct {
	ActorUserID        string
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
RequestLeaveDeletionInput contains the requester-owned delete request for approved leave that already started.
*/
type RequestLeaveDeletionInput struct {
	ActorUserID    string
	LeaveRequestID string
	Reason         string
}

/*
DecideLeaveChangeInput contains an approver decision for a member-requested correction.
*/
type DecideLeaveChangeInput struct {
	ActorUserID     string
	IsSystemAdmin   bool
	ChangeRequestID string
	Decision        string
	Comment         string
}

/*
ListPendingChanges returns member-requested leave corrections waiting for approval.
*/
func (s *LeaveService) ListPendingChanges(
	ctx context.Context,
	input ListPendingLeaveChangesInput,
) ([]domain.LeaveChangeRequestWithType, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view leave edit requests.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if err := s.requireLeaveDecisionPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	changeRequests, err := s.leaveStore.ListPendingChangeRequestsByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load leave edit requests.")
	}

	return changeRequests, nil
}

/*
RequestChange creates an approval-gated edit request for an existing leave row.

Requester edits to approved leave must not mutate the approved schedule directly, even before the leave starts. This method stores the proposed replacement fields, notifies leave approvers, and leaves the original request untouched until an approver explicitly accepts the edit.
*/
func (s *LeaveService) RequestChange(
	ctx context.Context,
	input RequestLeaveChangeInput,
) (*domain.LeaveChangeRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to request a leave edit.")
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
		return nil, NewError(ErrorCodePermissionDenied, "Only the requester can ask to edit this leave request.")
	}

	if existingRequest.Status != domain.LeaveStatusApproved {
		return nil, NewError(ErrorCodeConflict, "Only approved leave requires an edit request. Edit pending leave directly.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, existingRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
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

	alreadyPending, err := s.leaveStore.HasPendingChangeRequestForLeaveRequest(ctx, existingRequest.ID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not check existing leave edit requests.")
	}

	if alreadyPending {
		return nil, NewError(ErrorCodeConflict, "This leave request already has a pending edit request.")
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
			warning = "Leave edit request is invalid."
		}

		return nil, NewError(ErrorCodeValidationFailed, warning)
	}

	startDate := domain.LocalDate(strings.TrimSpace(input.StartDate))
	endDate := domain.LocalDate(strings.TrimSpace(input.EndDate))
	durationMode := domain.LeaveDurationMode(strings.TrimSpace(input.DurationMode))

	activeLeaveRequests, err := s.leaveStore.ListActiveByWorkspaceIDAndUserID(ctx, workspace.ID, cleanActorUserID)
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
				"This edit overlaps another pending or approved leave request.",
			)
		}
	}

	now := time.Now().UTC()
	changeRequest := domain.LeaveChangeRequest{
		ID:                 domain.ID(uuid.NewString()),
		LeaveRequestID:     existingRequest.ID,
		WorkspaceID:        workspace.ID,
		RequesterUserID:    cleanActorUserID,
		Action:             domain.LeaveChangeRequestActionEdit,
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
		Status:             domain.LeaveChangeRequestStatusPending,
		CreatedBy:          cleanActorUserID,
		DecidedBy:          "",
		DecisionComment:    "",
		CreatedAt:          now,
		UpdatedAt:          now,
		DecidedAt:          nil,
	}

	created, err := s.leaveStore.CreateChangeRequest(ctx, changeRequest)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create leave edit request.")
	}

	recipientUserIDs, err := s.leaveChangeRequestNotificationRecipients(ctx, *workspace, cleanActorUserID)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveChangeRequested(ctx, LeaveChangeRequestNotification{
			ChangeRequestID: created.ID.String(),
			LeaveRequestID:  existingRequest.ID.String(),
			WorkspaceID:     workspace.ID.String(),
			WorkspaceName:   workspace.Name,
			ChannelID:       workspace.ChannelID,
			Language:        workspace.GeneratedMessageLanguage,

			RequesterUserID:  cleanActorUserID,
			RecipientUserIDs: recipientUserIDs,

			Action:             string(created.Action),
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
		})
	}

	return created, nil
}

/*
RequestDeletion creates an approval-gated deletion request for approved leave that has already started.

Before approval or before the approved start instant, requesters can delete directly. Once the approved leave has started, deleting it changes historical availability and reports, so the requester must ask a Lead, Approver, or system admin to perform the deletion.
*/
func (s *LeaveService) RequestDeletion(
	ctx context.Context,
	input RequestLeaveDeletionInput,
) (*domain.LeaveChangeRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to request leave deletion.")
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
		return nil, NewError(ErrorCodePermissionDenied, "Only the requester can ask to delete this leave request.")
	}

	if existingRequest.Status != domain.LeaveStatusApproved {
		return nil, NewError(ErrorCodeConflict, "Only approved leave that has already started needs a deletion request. Delete pending leave directly.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, existingRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	started, err := approvedLeaveHasStarted(time.Now().UTC(), workspace.Timezone, *existingRequest)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not validate leave deletion window.")
	}

	if !started {
		return nil, NewError(ErrorCodeConflict, "This leave can be deleted directly because it has not started yet.")
	}

	leaveType, err := s.leaveStore.GetTypeByID(ctx, workspace.ID, existingRequest.LeaveTypeID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "Leave type was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not validate leave type.")
	}

	alreadyPending, err := s.leaveStore.HasPendingChangeRequestForLeaveRequest(ctx, existingRequest.ID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not check existing leave deletion requests.")
	}

	if alreadyPending {
		return nil, NewError(ErrorCodeConflict, "This leave request already has a pending edit or deletion request.")
	}

	now := time.Now().UTC()
	deleteRequest := domain.LeaveChangeRequest{
		ID:                 domain.ID(uuid.NewString()),
		LeaveRequestID:     existingRequest.ID,
		WorkspaceID:        workspace.ID,
		RequesterUserID:    cleanActorUserID,
		Action:             domain.LeaveChangeRequestActionDelete,
		LeaveTypeID:        existingRequest.LeaveTypeID,
		StartDate:          existingRequest.StartDate,
		EndDate:            existingRequest.EndDate,
		DurationMode:       existingRequest.DurationMode,
		HalfDayPart:        existingRequest.HalfDayPart,
		StartTime:          existingRequest.StartTime,
		EndTime:            existingRequest.EndTime,
		Reason:             strings.TrimSpace(input.Reason),
		BackupUserID:       existingRequest.BackupUserID,
		CanContactIfNeeded: existingRequest.CanContactIfNeeded,
		Status:             domain.LeaveChangeRequestStatusPending,
		CreatedBy:          cleanActorUserID,
		DecidedBy:          "",
		DecisionComment:    "",
		CreatedAt:          now,
		UpdatedAt:          now,
		DecidedAt:          nil,
	}

	created, err := s.leaveStore.CreateChangeRequest(ctx, deleteRequest)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create leave deletion request.")
	}

	recipientUserIDs, err := s.leaveChangeRequestNotificationRecipients(ctx, *workspace, cleanActorUserID)
	if err == nil {
		_ = s.notificationPublisher.NotifyLeaveChangeRequested(ctx, LeaveChangeRequestNotification{
			ChangeRequestID: created.ID.String(),
			LeaveRequestID:  existingRequest.ID.String(),
			WorkspaceID:     workspace.ID.String(),
			WorkspaceName:   workspace.Name,
			ChannelID:       workspace.ChannelID,
			Language:        workspace.GeneratedMessageLanguage,

			RequesterUserID:  cleanActorUserID,
			RecipientUserIDs: recipientUserIDs,

			Action:             string(created.Action),
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
		})
	}

	return created, nil
}

/*
DecideChange approves or rejects one member-requested leave correction.
*/
func (s *LeaveService) DecideChange(
	ctx context.Context,
	input DecideLeaveChangeInput,
) (*domain.LeaveChangeRequest, *domain.LeaveRequest, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, nil, NewError(ErrorCodePermissionDenied, "You must be signed in to decide leave edit requests.")
	}

	cleanChangeRequestID := strings.TrimSpace(input.ChangeRequestID)
	if cleanChangeRequestID == "" {
		return nil, nil, NewError(ErrorCodeValidationFailed, "Leave edit request ID is required.")
	}

	decisionStatus := domain.LeaveChangeRequestStatus(strings.TrimSpace(input.Decision))
	if decisionStatus != domain.LeaveChangeRequestStatusApproved && decisionStatus != domain.LeaveChangeRequestStatusRejected {
		return nil, nil, NewError(ErrorCodeValidationFailed, "Decision must be approved or rejected.")
	}

	changeRequest, err := s.leaveStore.GetChangeRequestByID(ctx, domain.ID(cleanChangeRequestID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, nil, NewError(ErrorCodeNotFound, "Leave edit request was not found.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not load leave edit request.")
	}

	if changeRequest.Status != domain.LeaveChangeRequestStatusPending {
		return nil, nil, NewError(ErrorCodeConflict, "Only pending leave edit requests can be decided.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, changeRequest.WorkspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireLeaveDecisionPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspace.ID); err != nil {
		return nil, nil, err
	}

	var leaveType *domain.LeaveType
	if changeRequest.Action == domain.LeaveChangeRequestActionDelete {
		leaveType, err = s.leaveStore.GetTypeByID(ctx, workspace.ID, changeRequest.LeaveTypeID)
	} else {
		leaveType, err = s.leaveStore.GetActiveTypeByID(ctx, workspace.ID, changeRequest.LeaveTypeID)
	}
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, nil, NewError(ErrorCodeValidationFailed, "Leave type was not found.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not load leave type.")
	}

	now := time.Now().UTC()
	decidedChangeRequest, leaveRequest, err := s.leaveStore.DecideChangeRequest(ctx, store.DecideLeaveChangeRequestParams{
		ChangeRequestID: changeRequest.ID,
		Decision:        decisionStatus,
		DecidedBy:       cleanActorUserID,
		Comment:         strings.TrimSpace(input.Comment),
		UpdatedAt:       now,
		DecidedAt:       now,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, nil, NewError(ErrorCodeConflict, "Only pending leave edit requests can be decided.")
		}

		return nil, nil, NewError(ErrorCodeInternal, "Could not decide leave edit request.")
	}

	_ = s.notificationPublisher.NotifyLeaveChangeDecided(ctx, LeaveChangeDecisionNotification{
		ChangeRequestID: decidedChangeRequest.ID.String(),
		LeaveRequestID:  leaveRequest.ID.String(),
		WorkspaceID:     workspace.ID.String(),
		WorkspaceName:   workspace.Name,
		ChannelID:       workspace.ChannelID,
		Language:        workspace.GeneratedMessageLanguage,

		AnnouncementChannelID: workspace.ApprovedLeaveNotificationChannelID,

		RequesterUserID: leaveRequest.UserID,
		DeciderUserID:   cleanActorUserID,

		Action:             string(decidedChangeRequest.Action),
		LeaveTypeName:      leaveType.Name,
		LeaveTypeCode:      leaveType.Code,
		StartDate:          decidedChangeRequest.StartDate.String(),
		EndDate:            decidedChangeRequest.EndDate.String(),
		DurationMode:       string(decidedChangeRequest.DurationMode),
		HalfDayPart:        string(decidedChangeRequest.HalfDayPart),
		StartTime:          decidedChangeRequest.StartTime.String(),
		EndTime:            decidedChangeRequest.EndTime.String(),
		CanContactIfNeeded: decidedChangeRequest.CanContactIfNeeded,
		Decision:           string(decisionStatus),
		Comment:            decidedChangeRequest.DecisionComment,
	})

	return decidedChangeRequest, leaveRequest, nil
}
