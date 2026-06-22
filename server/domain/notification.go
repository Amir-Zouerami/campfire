package domain

import "time"

/*
ReminderRule defines DM and channel reminders for a standup schedule.

ReminderOffsetsJSON stores scheduler minute marks inside the pre-close reminder
window. The webapp converts those marks into user-facing HH:mm reminder times.

Example:
  - close/report time: 10:00
  - offsets JSON: [30,45,55]
  - reminders: 09:30, 09:45, 09:55

Campfire keeps this JSON storage simple while the UI stays time-based.
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
		NotificationKindStandupOpeningAnnouncement identifies the channel-only message
		sent when a standup submission window opens.
	*/
	NotificationKindStandupOpeningAnnouncement NotificationKind = "standup_opening_announcement"

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
	case NotificationKindStandupOpeningAnnouncement, NotificationKindDMReminder, NotificationKindChannelMissingReminder:
		return true
	default:
		return false
	}
}
