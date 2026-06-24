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
WriteLookupChannels writes the channel lookup response.
*/
func WriteLookupChannels(w http.ResponseWriter, statusCode int, payload LookupChannelsResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode channel lookup response")
}

/*
WriteSearchChannels writes the channel search response.
*/
func WriteSearchChannels(w http.ResponseWriter, statusCode int, payload SearchChannelsResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode channel search response")
}

/*
WriteLookupUsers writes the user lookup response.
*/
func WriteLookupUsers(w http.ResponseWriter, statusCode int, payload LookupUsersResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode user lookup response")
}

/*
WriteListWorkspaceMembers writes the workspace member list response.
*/
func WriteListWorkspaceMembers(w http.ResponseWriter, statusCode int, payload ListWorkspaceMembersResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace member list response")
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
WriteListWorkspaceRoles writes the workspace role overview response.
*/
func WriteListWorkspaceRoles(w http.ResponseWriter, statusCode int, payload ListWorkspaceRolesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace role overview response")
}

/*
WriteUpsertWorkspaceRole writes the role assignment mutation response.
*/
func WriteUpsertWorkspaceRole(w http.ResponseWriter, statusCode int, payload UpsertWorkspaceRoleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace role assignment response")
}

/*
WriteDeleteWorkspace writes the workspace archive/delete response.
*/
func WriteDeleteWorkspace(w http.ResponseWriter, statusCode int, payload DeleteWorkspaceResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode delete workspace response")
}

/*
WriteDeleteWorkspaceRole writes the role assignment delete response.
*/
func WriteDeleteWorkspaceRole(w http.ResponseWriter, statusCode int, payload DeleteWorkspaceRoleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace role delete response")
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
WriteUpdateWorkspaceNotificationSettings writes the updated workspace notification settings response.
*/
func WriteUpdateWorkspaceNotificationSettings(
	w http.ResponseWriter,
	statusCode int,
	payload UpdateWorkspaceNotificationSettingsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated workspace notification settings response")
}

/*
WriteUpdateWorkspaceTimezone writes the updated workspace timezone response.
*/
func WriteUpdateWorkspaceTimezone(w http.ResponseWriter, statusCode int, payload UpdateWorkspaceTimezoneResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated workspace timezone response")
}

/*
WriteListWorkspaceWorkingDays writes the workspace working-day list response.
*/
func WriteListWorkspaceWorkingDays(
	w http.ResponseWriter,
	statusCode int,
	payload ListWorkspaceWorkingDaysResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace working-day list response")
}

/*
WriteUpdateWorkspaceWorkingDays writes the updated workspace working-day response.
*/
func WriteUpdateWorkspaceWorkingDays(
	w http.ResponseWriter,
	statusCode int,
	payload UpdateWorkspaceWorkingDaysResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated workspace working-day response")
}

/*
WriteListWorkspaceOffDays writes the workspace off-day list response.
*/
func WriteListWorkspaceOffDays(w http.ResponseWriter, statusCode int, payload ListWorkspaceOffDaysResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode workspace off-day list response")
}

/*
WriteListReminderRules writes the reminder rule list response.
*/
func WriteListReminderRules(w http.ResponseWriter, statusCode int, payload ListReminderRulesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode reminder rule list response")
}

/*
WriteUpdateReminderRule writes the updated reminder rule response.
*/
func WriteUpdateReminderRule(w http.ResponseWriter, statusCode int, payload UpdateReminderRuleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated reminder rule response")
}

/*
WriteCreateWorkspaceOffDay writes the created workspace off-day response.
*/
func WriteCreateWorkspaceOffDay(w http.ResponseWriter, statusCode int, payload CreateWorkspaceOffDayResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created workspace off-day response")
}

/*
WriteDeleteWorkspaceOffDay writes the deleted workspace off-day response.
*/
func WriteDeleteWorkspaceOffDay(w http.ResponseWriter, statusCode int, payload DeleteWorkspaceOffDayResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted workspace off-day response")
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
WriteUpdateLeave writes the leave update response.
*/
func WriteUpdateLeave(w http.ResponseWriter, statusCode int, payload UpdateLeaveResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave update response")
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
WriteListMyActiveLeaveRequests writes the current user's active leave request list response.
*/
func WriteListMyActiveLeaveRequests(
	w http.ResponseWriter,
	statusCode int,
	payload ListMyActiveLeaveRequestsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode my active leave request list response")
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
WriteListPendingLeaveChangeRequests writes the pending leave edit request list response.
*/
func WriteListPendingLeaveChangeRequests(
	w http.ResponseWriter,
	statusCode int,
	payload ListPendingLeaveChangeRequestsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode pending leave edit request list response")
}

/*
WriteCreateLeaveChange writes the created leave edit request response.
*/
func WriteCreateLeaveChange(w http.ResponseWriter, statusCode int, payload CreateLeaveChangeResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created leave edit request response")
}

/*
WriteCreateLeaveDeletion writes the created leave deletion request response.
*/
func WriteCreateLeaveDeletion(w http.ResponseWriter, statusCode int, payload CreateLeaveDeletionResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created leave deletion request response")
}

/*
WriteDecideLeaveChange writes the leave edit request decision response.
*/
func WriteDecideLeaveChange(w http.ResponseWriter, statusCode int, payload DecideLeaveChangeResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode leave edit request decision response")
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
WriteListAuditLog writes the audit-log list response.
*/
func WriteListAuditLog(w http.ResponseWriter, statusCode int, payload ListAuditLogResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode audit log response")
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
WriteCreateStandupTemplate writes the created standup template response.
*/
func WriteCreateStandupTemplate(w http.ResponseWriter, statusCode int, payload CreateStandupTemplateResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created standup template response")
}

/*
WriteUpdateStandupTemplate writes the updated standup template response.
*/
func WriteUpdateStandupTemplate(w http.ResponseWriter, statusCode int, payload UpdateStandupTemplateResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated standup template response")
}

/*
WriteDeleteStandupTemplate writes the deleted standup template response.
*/
func WriteDeleteStandupTemplate(w http.ResponseWriter, statusCode int, payload DeleteStandupTemplateResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted standup template response")
}

/*
WriteCreateStandupQuestion writes the created standup question response.
*/
func WriteCreateStandupQuestion(w http.ResponseWriter, statusCode int, payload CreateStandupQuestionResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created standup question response")
}

/*
WriteUpdateStandupQuestion writes the updated standup question response.
*/
func WriteUpdateStandupQuestion(w http.ResponseWriter, statusCode int, payload UpdateStandupQuestionResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated standup question response")
}

/*
WriteDeleteStandupQuestion writes the deleted standup question response.
*/
func WriteDeleteStandupQuestion(w http.ResponseWriter, statusCode int, payload DeleteStandupQuestionResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted standup question response")
}

/*
WriteCreateStandupSchedule writes the created standup schedule response.
*/
func WriteCreateStandupSchedule(w http.ResponseWriter, statusCode int, payload CreateStandupScheduleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created standup schedule response")
}

/*
WriteUpdateStandupSchedule writes the updated standup schedule response.
*/
func WriteUpdateStandupSchedule(w http.ResponseWriter, statusCode int, payload UpdateStandupScheduleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated standup schedule response")
}

/*
WriteDeleteStandupSchedule writes the deleted standup schedule response.
*/
func WriteDeleteStandupSchedule(w http.ResponseWriter, statusCode int, payload DeleteStandupScheduleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted standup schedule response")
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
WriteGetMyStandupSubmission writes the current user's stored standup response.
*/
func WriteGetMyStandupSubmission(w http.ResponseWriter, statusCode int, payload GetMyStandupSubmissionResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode current-user standup submission response")
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
WriteListMyTasks writes the current-user task list response.
*/
func WriteListMyTasks(w http.ResponseWriter, statusCode int, payload ListMyTasksResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode task list response")
}

/*
WriteCreateTask writes the created task response.
*/
func WriteCreateTask(w http.ResponseWriter, statusCode int, payload CreateTaskResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created task response")
}

/*
WriteUpdateTask writes the updated task response.
*/
func WriteUpdateTask(w http.ResponseWriter, statusCode int, payload UpdateTaskResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated task response")
}

/*
WriteListMyTimeEntries writes the current-user time-entry list response.
*/
func WriteListMyTimeEntries(w http.ResponseWriter, statusCode int, payload ListMyTimeEntriesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode time-entry list response")
}

/*
WriteCreateTimeEntry writes the created time-entry response.
*/
func WriteCreateTimeEntry(w http.ResponseWriter, statusCode int, payload CreateTimeEntryResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created time-entry response")
}

/*
WriteDeleteTimeEntry writes the deleted time-entry response.
*/
func WriteDeleteTimeEntry(w http.ResponseWriter, statusCode int, payload DeleteTimeEntryResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted time-entry response")
}

/*
WriteListReportRules writes the report rule list response.
*/
func WriteListReportRules(w http.ResponseWriter, statusCode int, payload ListReportRulesResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode report rule list response")
}

/*
WriteUpdateReportRule writes the updated report rule response.
*/
func WriteUpdateReportRule(w http.ResponseWriter, statusCode int, payload UpdateReportRuleResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode updated report rule response")
}

/*
WriteGetWeeklyReportPreview writes the weekly report preview response.
*/
func WriteGetWeeklyReportPreview(
	w http.ResponseWriter,
	statusCode int,
	payload GetWeeklyReportPreviewResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode weekly report preview response")
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
WriteGetTimeReportSummary writes the time report summary response.
*/
func WriteGetTimeReportSummary(
	w http.ResponseWriter,
	statusCode int,
	payload GetTimeReportSummaryResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode time report summary response")
}

/*
WriteGetGlobalTimeReportSummary writes the global time report summary response.
*/
func WriteGetGlobalTimeReportSummary(
	w http.ResponseWriter,
	statusCode int,
	payload GetGlobalTimeReportSummaryResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode global time report summary response")
}

/*
WriteGetGlobalLeaveReportSummary writes the global leave report summary response.
*/
func WriteGetGlobalLeaveReportSummary(
	w http.ResponseWriter,
	statusCode int,
	payload GetGlobalLeaveReportSummaryResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode global leave report summary response")
}

/*
WritePostWeeklyReportPreview writes the posted weekly report preview response.
*/
func WritePostWeeklyReportPreview(
	w http.ResponseWriter,
	statusCode int,
	payload PostWeeklyReportPreviewResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode posted weekly report preview response")
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

/*
WriteListDailyReportRuns writes the daily report run history response.
*/
func WriteListDailyReportRuns(
	w http.ResponseWriter,
	statusCode int,
	payload ListDailyReportRunsResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode daily report runs response")
}

/*
WriteListSavedReportFilters writes the saved report filter list response.
*/
func WriteListSavedReportFilters(w http.ResponseWriter, statusCode int, payload ListSavedReportFiltersResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode saved report filter list response")
}

/*
WriteCreateSavedReportFilter writes the created saved report filter response.
*/
func WriteCreateSavedReportFilter(w http.ResponseWriter, statusCode int, payload CreateSavedReportFilterResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode created saved report filter response")
}

/*
WriteDeleteSavedReportFilter writes the saved report filter delete response.
*/
func WriteDeleteSavedReportFilter(w http.ResponseWriter, statusCode int, payload DeleteSavedReportFilterResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode deleted saved report filter response")
}

/*
WriteGetDataRetentionPreview writes the data-retention preview response.
*/
func WriteGetDataRetentionPreview(
	w http.ResponseWriter,
	statusCode int,
	payload GetDataRetentionPreviewResponse,
) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode data-retention preview response")
}

/*
WritePurgeWorkspaceData writes the data-retention purge response.
*/
func WritePurgeWorkspaceData(w http.ResponseWriter, statusCode int, payload PurgeWorkspaceDataResponse) {
	writeResponse(w, statusCode, func(encoder *json.Encoder) error {
		return encoder.Encode(payload)
	}, "failed to encode data-retention purge response")
}
