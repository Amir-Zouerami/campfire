package service

import (
	"context"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
StandupOpeningAnnouncement contains data needed for the channel-only message sent
when a standup submission window opens.
*/
type StandupOpeningAnnouncement struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	ScheduleID     string
	ScheduleKind   domain.StandupKind
	OccurrenceDate string
	Language       domain.Language
}

/*
StandupDMReminder contains data needed to DM one user about a standup.
*/
type StandupDMReminder struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	ScheduleID     string
	OccurrenceDate string
	Language       domain.Language

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
	Language       domain.Language

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
	SendStandupOpeningAnnouncement(ctx context.Context, announcement StandupOpeningAnnouncement) (string, error)
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
SendStandupOpeningAnnouncement intentionally does nothing and returns an empty post ID.
*/
func (p *NoopStandupReminderPublisher) SendStandupOpeningAnnouncement(
	_ context.Context,
	_ StandupOpeningAnnouncement,
) (string, error) {
	return "", nil
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
