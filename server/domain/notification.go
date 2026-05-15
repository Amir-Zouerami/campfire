package domain

import "time"

/*
ReminderRule defines DM and channel reminders for a standup schedule.

ReminderOffsetsJSON stores exact minute offsets from the schedule time.

Example:
  - schedule time: 09:00
  - offsets JSON: [0,30,45,55]
  - reminders: 09:00, 09:30, 09:45, 09:55

This is more flexible than fixed count + interval and supports Campfire's
morning reminder window UX.
*/
type ReminderRule struct {
	ID          ID
	WorkspaceID ID
	ScheduleID  ID

	Enabled bool

	ChannelReminderEnabled bool
	DMReminderEnabled      bool

	ReminderOffsetsJSON string

	MentionMissingInChannel bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
NotificationRun records one sent scheduler notification.

Notification runs make reminders idempotent so restarts or repeated scheduler
ticks do not resend the same DM or channel reminder.
*/
type NotificationRun struct {
	ID             ID
	WorkspaceID    ID
	ReminderRuleID ID
	ScheduleID     ID

	NotificationKind NotificationKind
	OccurrenceDate   LocalDate
	SequenceNumber   int
	TargetUserID     string
	MattermostPostID string

	SentAt    time.Time
	CreatedAt time.Time
}

/*
NotificationKind identifies scheduler notification types.
*/
type NotificationKind string

const (
	/*
		NotificationKindDMReminder identifies a direct-message standup reminder.
	*/
	NotificationKindDMReminder NotificationKind = "dm_reminder"

	/*
		NotificationKindChannelMissingReminder identifies a channel post for missing users.
	*/
	NotificationKindChannelMissingReminder NotificationKind = "channel_missing_reminder"
)

/*
IsValid returns true when the notification kind is supported by Campfire.
*/
func (k NotificationKind) IsValid() bool {
	switch k {
	case NotificationKindDMReminder, NotificationKindChannelMissingReminder:
		return true
	default:
		return false
	}
}
