import type {
	CreateGlobalSkipDateRequest,
	CreateGlobalSkipDateResponse,
	CreateWorkspaceOffDayRequest,
	CreateWorkspaceOffDayResponse,
	DeleteGlobalSkipDateResponse,
	DeleteWorkspaceOffDayResponse,
	ListGlobalSkipDatesResponse,
	ListReminderRulesResponse,
	ListReportRulesResponse,
	ListWorkspaceOffDaysResponse,
	ListWorkspaceWorkingDaysResponse,
	UpdateReminderRuleRequest,
	UpdateReminderRuleResponse,
	UpdateReportRuleRequest,
	UpdateReportRuleResponse,
	UpdateWorkspaceWorkingDaysRequest,
	UpdateWorkspaceWorkingDaysResponse,
} from '@/types/api';

import { encodePath, requestJson } from './http';

/**
 * listGlobalSkipDates calls GET /settings/global/skip-dates.
 */
export function listGlobalSkipDates(): Promise<ListGlobalSkipDatesResponse> {
	return requestJson<ListGlobalSkipDatesResponse>('/settings/global/skip-dates');
}

/**
 * createGlobalSkipDate calls POST /settings/global/skip-dates.
 */
export function createGlobalSkipDate(request: CreateGlobalSkipDateRequest): Promise<CreateGlobalSkipDateResponse> {
	return requestJson<CreateGlobalSkipDateResponse>('/settings/global/skip-dates', {
		method: 'POST',
		body: request,
	});
}

/**
 * deleteGlobalSkipDate calls DELETE /settings/global/skip-dates/{skipDateID}.
 */
export function deleteGlobalSkipDate(skipDateID: string): Promise<DeleteGlobalSkipDateResponse> {
	return requestJson<DeleteGlobalSkipDateResponse>(`/settings/global/skip-dates/${encodePath(skipDateID)}`, {
		method: 'DELETE',
	});
}

/**
 * listWorkspaceWorkingDays calls GET /workspaces/{workspaceID}/working-days.
 */
export function listWorkspaceWorkingDays(workspaceID: string): Promise<ListWorkspaceWorkingDaysResponse> {
	return requestJson<ListWorkspaceWorkingDaysResponse>(`/workspaces/${encodePath(workspaceID)}/working-days`);
}

/**
 * updateWorkspaceWorkingDays calls PUT /workspaces/{workspaceID}/working-days.
 */
export function updateWorkspaceWorkingDays(
	workspaceID: string,
	request: UpdateWorkspaceWorkingDaysRequest,
): Promise<UpdateWorkspaceWorkingDaysResponse> {
	return requestJson<UpdateWorkspaceWorkingDaysResponse>(`/workspaces/${encodePath(workspaceID)}/working-days`, {
		method: 'PUT',
		body: request,
	});
}

/**
 * listWorkspaceOffDays calls GET /workspaces/{workspaceID}/off-days.
 */
export function listWorkspaceOffDays(workspaceID: string): Promise<ListWorkspaceOffDaysResponse> {
	return requestJson<ListWorkspaceOffDaysResponse>(`/workspaces/${encodePath(workspaceID)}/off-days`);
}

/**
 * createWorkspaceOffDay calls POST /workspaces/{workspaceID}/off-days.
 */
export function createWorkspaceOffDay(
	workspaceID: string,
	request: CreateWorkspaceOffDayRequest,
): Promise<CreateWorkspaceOffDayResponse> {
	return requestJson<CreateWorkspaceOffDayResponse>(`/workspaces/${encodePath(workspaceID)}/off-days`, {
		method: 'POST',
		body: request,
	});
}

/**
 * deleteWorkspaceOffDay calls DELETE /workspaces/{workspaceID}/off-days/{offDayID}.
 */
export function deleteWorkspaceOffDay(workspaceID: string, offDayID: string): Promise<DeleteWorkspaceOffDayResponse> {
	return requestJson<DeleteWorkspaceOffDayResponse>(
		`/workspaces/${encodePath(workspaceID)}/off-days/${encodePath(offDayID)}`,
		{
			method: 'DELETE',
		},
	);
}

/**
 * listReminderRules calls GET /workspaces/{workspaceID}/reminders.
 */
export function listReminderRules(workspaceID: string): Promise<ListReminderRulesResponse> {
	return requestJson<ListReminderRulesResponse>(`/workspaces/${encodePath(workspaceID)}/reminders`);
}

/**
 * updateReminderRule calls PUT /workspaces/{workspaceID}/reminders/{reminderRuleID}.
 */
export function updateReminderRule(
	workspaceID: string,
	reminderRuleID: string,
	request: UpdateReminderRuleRequest,
): Promise<UpdateReminderRuleResponse> {
	return requestJson<UpdateReminderRuleResponse>(
		`/workspaces/${encodePath(workspaceID)}/reminders/${encodePath(reminderRuleID)}`,
		{
			method: 'PUT',
			body: request,
		},
	);
}

/**
 * listReportRules calls GET /workspaces/{workspaceID}/reports/rules.
 */
export function listReportRules(workspaceID: string): Promise<ListReportRulesResponse> {
	return requestJson<ListReportRulesResponse>(`/workspaces/${encodePath(workspaceID)}/reports/rules`);
}

/**
 * updateReportRule calls PUT /workspaces/{workspaceID}/reports/rules/{reportRuleID}.
 */
export function updateReportRule(
	workspaceID: string,
	reportRuleID: string,
	request: UpdateReportRuleRequest,
): Promise<UpdateReportRuleResponse> {
	return requestJson<UpdateReportRuleResponse>(
		`/workspaces/${encodePath(workspaceID)}/reports/rules/${encodePath(reportRuleID)}`,
		{
			method: 'PUT',
			body: request,
		},
	);
}
