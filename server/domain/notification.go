package domain

import "time"

/*
ReminderRule defines DM and channel reminders for a standup schedule.
*/
type ReminderRule struct {
	ID          ID
	WorkspaceID ID
	ScheduleID  ID

	Enabled bool

	ChannelReminderEnabled bool
	DMReminderEnabled      bool

	ReminderCount   int
	IntervalMinutes int

	StartOffsetMinutes int

	MentionMissingInChannel bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}
