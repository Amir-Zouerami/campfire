package store

import "errors"

var (
	/*
		ErrNotFound is returned when a requested record does not exist.
	*/
	ErrNotFound = errors.New("not found")

	/*
		ErrConflict is returned when a persistence operation violates uniqueness
		or conflicts with existing data.
	*/
	ErrConflict = errors.New("conflict")

	/*
		ErrUnavailable is returned when persistence has not been connected yet.
	*/
	ErrUnavailable = errors.New("store unavailable")
)
