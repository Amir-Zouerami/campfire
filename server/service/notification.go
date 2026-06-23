package service

import (
	"context"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
LeaveRequestNotification contains the data needed to notify leave approvers.
*/
type LeaveRequestNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	Language       domain.ReportLanguage

	RequesterUserID  string
	RecipientUserIDs []string

	LeaveTypeName      string
	LeaveTypeCode      string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	Reason             string
	BackupUserID       string
	CanContactIfNeeded bool
	Status             string
}

/*
LeaveDecisionNotification contains the data needed to notify a requester after a
leave approval decision.
*/
type LeaveDecisionNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	Language       domain.ReportLanguage

	/*
		AnnouncementChannelID optionally overrides the workspace channel for
		team-facing approved-leave announcements.
	*/
	AnnouncementChannelID string

	RequesterUserID string
	DeciderUserID   string

	LeaveTypeName      string
	LeaveTypeCode      string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	CanContactIfNeeded bool
	Decision           string
	Comment            string
}

/*
LeaveCancellationNotification contains the data needed to notify relevant users
after a requester cancels a pending or approved leave request.
*/
type LeaveCancellationNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	Language       domain.ReportLanguage

	/*
		AnnouncementChannelID optionally overrides the workspace channel for
		team-facing approved-leave cancellation announcements.
	*/
	AnnouncementChannelID string

	RequesterUserID  string
	RecipientUserIDs []string

	LeaveTypeName      string
	LeaveTypeCode      string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	CanContactIfNeeded bool
	Status             string
	WasApproved        bool
}

/*
LeaveChangeRequestNotification contains the data needed to notify approvers that
a member requested an edit to an existing leave request.
*/
type LeaveChangeRequestNotification struct {
	ChangeRequestID string
	LeaveRequestID  string
	WorkspaceID     string
	WorkspaceName   string
	ChannelID       string
	Language        domain.ReportLanguage

	RequesterUserID  string
	RecipientUserIDs []string

	LeaveTypeName      string
	LeaveTypeCode      string
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
LeaveChangeDecisionNotification contains the data needed to notify a member that
an approver accepted or rejected their requested leave correction.
*/
type LeaveChangeDecisionNotification struct {
	ChangeRequestID string
	LeaveRequestID  string
	WorkspaceID     string
	WorkspaceName   string
	ChannelID       string
	Language        domain.ReportLanguage

	RequesterUserID string
	DeciderUserID   string

	LeaveTypeName      string
	LeaveTypeCode      string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	CanContactIfNeeded bool
	Decision           string
	Comment            string
}

/*
LeaveUpdatedNotification contains the data needed to notify a requester after an
approver directly corrects an existing leave request.
*/
type LeaveUpdatedNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	Language       domain.ReportLanguage

	RequesterUserID string
	EditorUserID    string

	LeaveTypeName      string
	LeaveTypeCode      string
	StartDate          string
	EndDate            string
	DurationMode       string
	HalfDayPart        string
	StartTime          string
	EndTime            string
	CanContactIfNeeded bool
}

/*
NotificationPublisher defines outbound notification behavior.

Application services depend on this port instead of importing Mattermost APIs.
*/
type NotificationPublisher interface {
	NotifyLeaveRequested(ctx context.Context, notification LeaveRequestNotification) error
	NotifyLeaveDecided(ctx context.Context, notification LeaveDecisionNotification) error
	NotifyLeaveCancelled(ctx context.Context, notification LeaveCancellationNotification) error
	NotifyLeaveChangeRequested(ctx context.Context, notification LeaveChangeRequestNotification) error
	NotifyLeaveChangeDecided(ctx context.Context, notification LeaveChangeDecisionNotification) error
	NotifyLeaveUpdated(ctx context.Context, notification LeaveUpdatedNotification) error
}

/*
NoopNotificationPublisher intentionally drops notifications.

It is useful for tests and for future command-line tools that exercise services
without a Mattermost runtime.
*/
type NoopNotificationPublisher struct{}

/*
NewNoopNotificationPublisher creates a notification publisher that does nothing.
*/
func NewNoopNotificationPublisher() *NoopNotificationPublisher {
	return &NoopNotificationPublisher{}
}

/*
NotifyLeaveRequested intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveRequested(
	_ context.Context,
	_ LeaveRequestNotification,
) error {
	return nil
}

/*
NotifyLeaveDecided intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveDecided(
	_ context.Context,
	_ LeaveDecisionNotification,
) error {
	return nil
}

/*
NotifyLeaveCancelled intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveCancelled(
	_ context.Context,
	_ LeaveCancellationNotification,
) error {
	return nil
}

/*
NotifyLeaveChangeRequested intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveChangeRequested(
	_ context.Context,
	_ LeaveChangeRequestNotification,
) error {
	return nil
}

/*
NotifyLeaveChangeDecided intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveChangeDecided(
	_ context.Context,
	_ LeaveChangeDecisionNotification,
) error {
	return nil
}

/*
NotifyLeaveUpdated intentionally does nothing.
*/
func (p *NoopNotificationPublisher) NotifyLeaveUpdated(
	_ context.Context,
	_ LeaveUpdatedNotification,
) error {
	return nil
}
