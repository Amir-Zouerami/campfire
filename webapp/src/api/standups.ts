import type {
	CreateStandupQuestionRequest,
	CreateStandupQuestionResponse,
	CreateStandupScheduleRequest,
	CreateStandupScheduleResponse,
	CreateStandupTemplateRequest,
	CreateStandupTemplateResponse,
	DeleteStandupQuestionResponse,
	DeleteStandupScheduleResponse,
	DeleteStandupTemplateResponse,
	EvaluateStandupDayResponse,
	GetMyStandupSubmissionRequest,
	GetMyStandupSubmissionResponse,
	ListStandupConfigurationResponse,
	ListStandupSubmissionsRequest,
	ListStandupSubmissionsResponse,
	SubmitStandupRequest,
	SubmitStandupResponse,
	UpdateStandupQuestionRequest,
	UpdateStandupQuestionResponse,
	UpdateStandupScheduleRequest,
	UpdateStandupScheduleResponse,
	UpdateStandupTemplateRequest,
	UpdateStandupTemplateResponse,
} from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * ListStandupConfigurationOptions controls whether dormant templates are returned.
 */
type ListStandupConfigurationOptions = {
	readonly includeInactive?: boolean;
};

/**
 * listStandupConfiguration calls GET /workspaces/{workspaceID}/standups/configuration.
 */
export function listStandupConfiguration(
	workspaceID: string,
	options: ListStandupConfigurationOptions = {},
): Promise<ListStandupConfigurationResponse> {
	return requestJson<ListStandupConfigurationResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/standups/configuration`, {
			includeInactive: options.includeInactive === true ? true : undefined,
		}),
	);
}

/**
 * createStandupTemplate calls POST /workspaces/{workspaceID}/standups/templates.
 */
export function createStandupTemplate(
	workspaceID: string,
	request: CreateStandupTemplateRequest,
): Promise<CreateStandupTemplateResponse> {
	return requestJson<CreateStandupTemplateResponse>(`/workspaces/${encodePath(workspaceID)}/standups/templates`, {
		method: 'POST',
		body: request,
	});
}

/**
 * updateStandupTemplate calls PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export function updateStandupTemplate(
	workspaceID: string,
	templateID: string,
	request: UpdateStandupTemplateRequest,
): Promise<UpdateStandupTemplateResponse> {
	return requestJson<UpdateStandupTemplateResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/templates/${encodePath(templateID)}`,
		{
			method: 'PUT',
			body: request,
		},
	);
}

/**
 * deleteStandupTemplate calls DELETE /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export function deleteStandupTemplate(
	workspaceID: string,
	templateID: string,
): Promise<DeleteStandupTemplateResponse> {
	return requestJson<DeleteStandupTemplateResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/templates/${encodePath(templateID)}`,
		{ method: 'DELETE' },
	);
}

/**
 * createStandupQuestion calls POST /workspaces/{workspaceID}/standups/questions.
 */
export function createStandupQuestion(
	workspaceID: string,
	request: CreateStandupQuestionRequest,
): Promise<CreateStandupQuestionResponse> {
	return requestJson<CreateStandupQuestionResponse>(`/workspaces/${encodePath(workspaceID)}/standups/questions`, {
		method: 'POST',
		body: request,
	});
}

/**
 * updateStandupQuestion calls PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export function updateStandupQuestion(
	workspaceID: string,
	questionID: string,
	request: UpdateStandupQuestionRequest,
): Promise<UpdateStandupQuestionResponse> {
	return requestJson<UpdateStandupQuestionResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/questions/${encodePath(questionID)}`,
		{
			method: 'PUT',
			body: request,
		},
	);
}

/**
 * deleteStandupQuestion calls DELETE /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export function deleteStandupQuestion(
	workspaceID: string,
	questionID: string,
): Promise<DeleteStandupQuestionResponse> {
	return requestJson<DeleteStandupQuestionResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/questions/${encodePath(questionID)}`,
		{ method: 'DELETE' },
	);
}

/**
 * createStandupSchedule calls POST /workspaces/{workspaceID}/standups/schedules.
 */
export function createStandupSchedule(
	workspaceID: string,
	request: CreateStandupScheduleRequest,
): Promise<CreateStandupScheduleResponse> {
	return requestJson<CreateStandupScheduleResponse>(`/workspaces/${encodePath(workspaceID)}/standups/schedules`, {
		method: 'POST',
		body: request,
	});
}

/**
 * updateStandupSchedule calls PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export function updateStandupSchedule(
	workspaceID: string,
	scheduleID: string,
	request: UpdateStandupScheduleRequest,
): Promise<UpdateStandupScheduleResponse> {
	return requestJson<UpdateStandupScheduleResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/schedules/${encodePath(scheduleID)}`,
		{
			method: 'PUT',
			body: request,
		},
	);
}

/**
 * deleteStandupSchedule calls DELETE /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export function deleteStandupSchedule(
	workspaceID: string,
	scheduleID: string,
): Promise<DeleteStandupScheduleResponse> {
	return requestJson<DeleteStandupScheduleResponse>(
		`/workspaces/${encodePath(workspaceID)}/standups/schedules/${encodePath(scheduleID)}`,
		{ method: 'DELETE' },
	);
}

/**
 * submitStandup calls POST /standups/submissions.
 */
export function submitStandup(request: SubmitStandupRequest): Promise<SubmitStandupResponse> {
	return requestJson<SubmitStandupResponse>('/standups/submissions', {
		method: 'POST',
		body: request,
	});
}

/**
 * getMyStandupSubmission calls GET /workspaces/{workspaceID}/standups/my-submission.
 */
export function getMyStandupSubmission(
	request: GetMyStandupSubmissionRequest,
): Promise<GetMyStandupSubmissionResponse> {
	return requestJson<GetMyStandupSubmissionResponse>(
		withQuery(`/workspaces/${encodePath(request.workspaceId)}/standups/my-submission`, {
			occurrenceDate: request.occurrenceDate,
			templateId: request.templateId,
		}),
	);
}

/**
 * listStandupSubmissions calls GET /workspaces/{workspaceID}/standups/submissions.
 */
export function listStandupSubmissions(
	request: ListStandupSubmissionsRequest,
): Promise<ListStandupSubmissionsResponse> {
	return requestJson<ListStandupSubmissionsResponse>(
		withQuery(`/workspaces/${encodePath(request.workspaceId)}/standups/submissions`, {
			occurrenceDate: request.occurrenceDate,
			sortMode: request.sortMode,
		}),
	);
}

/**
 * evaluateStandupDay calls GET /workspaces/{workspaceID}/standup-runtime/day.
 */
export function evaluateStandupDay(workspaceID: string, date: string): Promise<EvaluateStandupDayResponse> {
	return requestJson<EvaluateStandupDayResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/standup-runtime/day`, {
			date,
		}),
	);
}
