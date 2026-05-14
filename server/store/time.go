package store

import "time"

/*
parseStoredTime parses timestamps returned by SQL drivers.

Some drivers scan TIMESTAMP columns into time.Time, but this helper exists for
stores that scan to string for portability. Empty or invalid values return zero.
*/
func parseStoredTime(value string) time.Time {
	if value == "" {
		return time.Time{}
	}

	parsed, err := time.Parse(time.RFC3339, value)
	if err == nil {
		return parsed
	}

	parsed, err = time.Parse("2006-01-02 15:04:05", value)
	if err == nil {
		return parsed
	}

	return time.Time{}
}
