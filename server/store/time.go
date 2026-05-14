package store

import "time"

/*
parseStoredTime returns the stored SQL timestamp.

This exists as a named helper so timestamp mapping stays explicit in stores.
*/
func parseStoredTime(value time.Time) time.Time {
	if value.IsZero() {
		return time.Time{}
	}

	return value.UTC()
}
