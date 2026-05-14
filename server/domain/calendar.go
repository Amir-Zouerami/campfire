package domain

import (
	"regexp"
	"time"
)

var localDatePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

/*
LocalDate is a YYYY-MM-DD date string interpreted in a workspace timezone.

It is used for standup occurrence dates, leave dates, skip dates, global off-days,
and time entry dates. Timestamps should still be stored separately as UTC time.Time.
*/
type LocalDate string

/*
String returns the date as a plain string.
*/
func (d LocalDate) String() string {
	return string(d)
}

/*
IsValid returns true when the date matches YYYY-MM-DD format.

This checks shape only. Calendar validity is handled by calendar services.
*/
func (d LocalDate) IsValid() bool {
	return localDatePattern.MatchString(string(d))
}

/*
TimeOfDay is an HH:mm local workspace time string.
*/
type TimeOfDay string

/*
String returns the time as a plain string.
*/
func (t TimeOfDay) String() string {
	return string(t)
}

/*
GlobalSkipDate represents a global Campfire off-day.

Global skip dates apply across all workspaces. Workspace-level skip dates still
exist for team-specific holidays, offsites, shutdowns, or no-standup days.
*/
type GlobalSkipDate struct {
	ID        ID
	Date      LocalDate
	Label     string
	CreatedBy string
	CreatedAt time.Time
}
