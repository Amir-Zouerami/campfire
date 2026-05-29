package service

import "context"

/*
StandupDMReminder contains data needed to DM one user about a standup.
*/
type StandupDMReminder struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	ScheduleID     string
	OccurrenceDate string

	TargetUserID string

	SequenceNumber int
}

/*
StandupChannelMissingReminder contains data needed to post a missing-user reminder.
*/
type StandupChannelMissingReminder struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	ScheduleID     string
	OccurrenceDate string

	MissingUserIDs      []string
	MissingUserCount    int
	MentionMissingUsers bool
	MentionLimit        int

	SequenceNumber int
}

/*
StandupReminderPublisher defines outbound reminder delivery behavior.

Application services depend on this port instead of importing Mattermost APIs.
*/
type StandupReminderPublisher interface {
	SendStandupDMReminder(ctx context.Context, reminder StandupDMReminder) (string, error)
	SendChannelMissingReminder(ctx context.Context, reminder StandupChannelMissingReminder) (string, error)
}

/*
NoopStandupReminderPublisher intentionally drops reminder posts.

It is useful for tests and non-Mattermost service execution.
*/
type NoopStandupReminderPublisher struct{}

/*
NewNoopStandupReminderPublisher creates a reminder publisher that does nothing.
*/
func NewNoopStandupReminderPublisher() *NoopStandupReminderPublisher {
	return &NoopStandupReminderPublisher{}
}

/*
SendStandupDMReminder intentionally does nothing and returns an empty post ID.
*/
func (p *NoopStandupReminderPublisher) SendStandupDMReminder(
	_ context.Context,
	_ StandupDMReminder,
) (string, error) {
	return "", nil
}

/*
SendChannelMissingReminder intentionally does nothing and returns an empty post ID.
*/
func (p *NoopStandupReminderPublisher) SendChannelMissingReminder(
	_ context.Context,
	_ StandupChannelMissingReminder,
) (string, error) {
	return "", nil
}
