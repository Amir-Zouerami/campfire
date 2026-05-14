package api

import (
	"encoding/json"
	"net/http"
)

/*
HealthResponse is returned by the Campfire health endpoint.
*/
type HealthResponse struct {
	Status  string `json:"status"`
	Product string `json:"product"`
	Version string `json:"version"`
}

/*
MeResponse is returned by the current user endpoint.
*/
type MeResponse struct {
	User          MeUserResponse `json:"user"`
	IsSystemAdmin bool           `json:"isSystemAdmin"`
}

/*
MeUserResponse contains the current user's public identity for Campfire UI.
*/
type MeUserResponse struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

/*
ErrorBody is the standard Campfire API error response body.
*/
type ErrorBody struct {
	Error ErrorPayload `json:"error"`
}

/*
ErrorPayload describes a typed API error that the frontend can render safely.
*/
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

/*
WriteHealth writes the health endpoint response.
*/
func WriteHealth(w http.ResponseWriter, statusCode int, payload HealthResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode health response")
}

/*
WriteMe writes the current user response.
*/
func WriteMe(w http.ResponseWriter, statusCode int, payload MeResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode current user response")
}

/*
WriteWorkspaceByChannel writes the workspace-by-channel response.
*/
func WriteWorkspaceByChannel(w http.ResponseWriter, statusCode int, payload WorkspaceByChannelResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace response")
}

/*
WriteCreateWorkspace writes the create-workspace response.
*/
func WriteCreateWorkspace(w http.ResponseWriter, statusCode int, payload CreateWorkspaceResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created workspace response")
}

/*
WriteListGlobalSkipDates writes the global skip date list response.
*/
func WriteListGlobalSkipDates(w http.ResponseWriter, statusCode int, payload ListGlobalSkipDatesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode global off-day list response")
}

/*
WriteCreateGlobalSkipDate writes the create global skip date response.
*/
func WriteCreateGlobalSkipDate(w http.ResponseWriter, statusCode int, payload CreateGlobalSkipDateResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created global off-day response")
}

/*
WriteDeleteGlobalSkipDate writes the delete global skip date response.
*/
func WriteDeleteGlobalSkipDate(w http.ResponseWriter, statusCode int, payload DeleteGlobalSkipDateResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted global off-day response")
}

/*
WriteValidateLeaveRequest writes the leave validation response.
*/
func WriteValidateLeaveRequest(w http.ResponseWriter, statusCode int, payload ValidateLeaveRequestResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave validation response")
}

/*
WriteError writes a standard Campfire API error response.
*/
func WriteError(w http.ResponseWriter, statusCode int, code string, message string) {
	payload := ErrorBody{
		Error: ErrorPayload{
			Code:    code,
			Message: message,
		},
	}

	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode error response")
}

/*
writeResponse writes a JSON response using a typed encoder callback.

This avoids exposing arbitrary response payloads through the public API helpers.
*/
func writeResponse(
	w http.ResponseWriter,
	statusCode int,
	encode func(encoder *json.Encoder) error,
	fallbackMessage string,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := encode(json.NewEncoder(w)); err != nil {
		http.Error(w, fallbackMessage, http.StatusInternalServerError)
	}
}
