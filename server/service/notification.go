package service

import "context"

/*
LeaveRequestNotification contains the data needed to notify leave approvers.
*/
type LeaveRequestNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string

	RequesterUserID string
	ApproverUserIDs []string

	LeaveTypeName string
	StartDate     string
	EndDate       string
	DurationMode  string
	HalfDayPart   string
	StartTime     string
	EndTime       string
	Reason        string
	BackupUserID  string
	Status        string
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

	RequesterUserID string
	DeciderUserID   string

	LeaveTypeName string
	StartDate     string
	EndDate       string
	DurationMode  string
	HalfDayPart   string
	StartTime     string
	EndTime       string
	Decision      string
	Comment       string
}

/*
LeaveCancellationNotification contains the data needed to notify approvers after
a requester cancels a pending leave request.
*/
type LeaveCancellationNotification struct {
	LeaveRequestID string
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string

	RequesterUserID string
	ApproverUserIDs []string

	LeaveTypeName string
	StartDate     string
	EndDate       string
	DurationMode  string
	HalfDayPart   string
	StartTime     string
	EndTime       string
	Status        string
}

/*
NotificationPublisher defines outbound notification behavior.

Application services depend on this port instead of importing Mattermost APIs.
*/
type NotificationPublisher interface {
	NotifyLeaveRequested(ctx context.Context, notification LeaveRequestNotification) error
	NotifyLeaveDecided(ctx context.Context, notification LeaveDecisionNotification) error
	NotifyLeaveCancelled(ctx context.Context, notification LeaveCancellationNotification) error
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
