package service

/*
ErrorCode identifies a typed service-layer failure.
*/
type ErrorCode string

const (
	/*
		ErrorCodeInvalidRequest means the request shape is invalid.
	*/
	ErrorCodeInvalidRequest ErrorCode = "invalid_request"

	/*
		ErrorCodeValidationFailed means request fields failed validation.
	*/
	ErrorCodeValidationFailed ErrorCode = "validation_failed"

	/*
		ErrorCodePermissionDenied means the user is not allowed to perform an action.
	*/
	ErrorCodePermissionDenied ErrorCode = "permission_denied"

	/*
		ErrorCodeNotFound means a requested resource does not exist.
	*/
	ErrorCodeNotFound ErrorCode = "not_found"

	/*
		ErrorCodeWorkspaceNotConfigured means no workspace exists for a channel.
	*/
	ErrorCodeWorkspaceNotConfigured ErrorCode = "workspace_not_configured"

	/*
		ErrorCodeInternal means an internal dependency failed.
	*/
	ErrorCodeInternal ErrorCode = "internal_error"
)

/*
Error is a typed service-layer error that API handlers can map to HTTP responses.
*/
type Error struct {
	Code    ErrorCode
	Message string
}

/*
Error returns the human-readable service error message.
*/
func (e *Error) Error() string {
	return e.Message
}

/*
NewError creates a typed service error.
*/
func NewError(code ErrorCode, message string) *Error {
	return &Error{
		Code:    code,
		Message: message,
	}
}

/*
AsError returns a typed service error when the provided error is one.
*/
func AsError(err error) (*Error, bool) {
	serviceError, ok := err.(*Error)
	return serviceError, ok
}
