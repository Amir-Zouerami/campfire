package store

import "errors"

var (
	/*
		ErrNotFound is returned when a requested record does not exist.
	*/
	ErrNotFound = errors.New("not found")

	/*
		ErrUnavailable is returned when persistence has not been connected yet.
	*/
	ErrUnavailable = errors.New("store unavailable")
)
