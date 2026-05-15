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
WriteValidateLeave writes the leave validation response.
*/
func WriteValidateLeave(w http.ResponseWriter, statusCode int, payload ValidateLeaveResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave validation response")
}

/*
WriteListLeaveTypes writes the leave type list response.
*/
func WriteListLeaveTypes(w http.ResponseWriter, statusCode int, payload ListLeaveTypesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave type list response")
}

/*
WriteCreateLeave writes the create leave response.
*/
func WriteCreateLeave(w http.ResponseWriter, statusCode int, payload CreateLeaveResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created leave response")
}

/*
WriteListPendingLeaveRequests writes the pending leave request list response.
*/
func WriteListPendingLeaveRequests(
	w http.ResponseWriter,
	statusCode int,
	payload ListPendingLeaveRequestsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode pending leave request list response")
}

/*
WriteDecideLeave writes the leave decision response.
*/
func WriteDecideLeave(w http.ResponseWriter, statusCode int, payload DecideLeaveResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave decision response")
}

/*
WriteListMyPendingLeaveRequests writes the current user's pending leave request list response.
*/
func WriteListMyPendingLeaveRequests(
	w http.ResponseWriter,
	statusCode int,
	payload ListMyPendingLeaveRequestsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode my pending leave request list response")
}

/*
WriteListApprovedLeaveRequests writes the approved leave request list response.
*/
func WriteListApprovedLeaveRequests(
	w http.ResponseWriter,
	statusCode int,
	payload ListApprovedLeaveRequestsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode approved leave request list response")
}

/*
WriteCancelLeave writes the leave cancellation response.
*/
func WriteCancelLeave(w http.ResponseWriter, statusCode int, payload CancelLeaveRequestResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave cancellation response")
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

/*
WriteEvaluateStandupDay writes the standup runtime day evaluation response.
*/
func WriteEvaluateStandupDay(w http.ResponseWriter, statusCode int, payload EvaluateStandupDayResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode standup runtime day evaluation response")
}

/*
WriteListStandupConfiguration writes the standup configuration response.
*/
func WriteListStandupConfiguration(
	w http.ResponseWriter,
	statusCode int,
	payload ListStandupConfigurationResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode standup configuration response")
}

/*
WriteSubmitStandup writes the standup submission response.
*/
func WriteSubmitStandup(w http.ResponseWriter, statusCode int, payload SubmitStandupResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode standup submission response")
}

/*
WriteListStandupSubmissions writes the standup submissions list response.
*/
func WriteListStandupSubmissions(
	w http.ResponseWriter,
	statusCode int,
	payload ListStandupSubmissionsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode standup submissions response")
}

/*
WriteGetDailyReportPreview writes the daily report preview response.
*/
func WriteGetDailyReportPreview(
	w http.ResponseWriter,
	statusCode int,
	payload GetDailyReportPreviewResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode daily report preview response")
}

/*
WritePostDailyReportPreview writes the posted daily report preview response.
*/
func WritePostDailyReportPreview(
	w http.ResponseWriter,
	statusCode int,
	payload PostDailyReportPreviewResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode posted daily report preview response")
}
