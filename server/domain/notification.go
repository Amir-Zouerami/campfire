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
