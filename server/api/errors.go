package api

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/service"
)

/*
WriteServiceError maps a typed service-layer error to a JSON HTTP response.
*/
func WriteServiceError(w http.ResponseWriter, err error) {
	serviceError, ok := service.AsError(err)
	if !ok {
		WriteError(w, http.StatusInternalServerError, "internal_error", "An unexpected Campfire error occurred.")
		return
	}

	WriteError(w, statusForServiceError(serviceError.Code), string(serviceError.Code), serviceError.Message)
}

/*
statusForServiceError maps service error codes to HTTP status codes.
*/
func statusForServiceError(code service.ErrorCode) int {
	switch code {
	case service.ErrorCodeInvalidRequest, service.ErrorCodeValidationFailed:
		return http.StatusBadRequest
	case service.ErrorCodePermissionDenied:
		return http.StatusForbidden
	case service.ErrorCodeNotFound, service.ErrorCodeWorkspaceNotConfigured:
		return http.StatusNotFound
	case service.ErrorCodeInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}
