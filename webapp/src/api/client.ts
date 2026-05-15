import type {
	ApiErrorBody,
	CreateGlobalSkipDateRequest,
	CreateGlobalSkipDateResponse,
	CreateWorkspaceRequest,
	CreateWorkspaceResponse,
	DeleteGlobalSkipDateResponse,
	HealthResponse,
	ListGlobalSkipDatesResponse,
	MeResponse,
	ValidateLeaveRequest,
	ValidateLeaveResponse,
	WorkspaceByChannelResponse,
} from '../types/api';

const pluginID = 'dev.zouerami.campfire';

/**
 * ApiClientError represents a typed Campfire API failure.
 */
export class ApiClientError extends Error {
	public readonly code: string;
	public readonly statusCode: number;

	/**
	 * Creates an API client error.
	 */
	public constructor(code: string, message: string, statusCode: number) {
		super(message);
		this.name = 'ApiClientError';
		this.code = code;
		this.statusCode = statusCode;
	}
}

/**
 * getHealth loads backend health information.
 */
export async function getHealth(): Promise<HealthResponse> {
	return apiGet<HealthResponse>('/health');
}

/**
 * getMe loads the current Mattermost user from the backend.
 */
export async function getMe(): Promise<MeResponse> {
	return apiGet<MeResponse>('/me');
}

/**
 * getWorkspaceByChannel loads the Campfire workspace for a Mattermost channel.
 */
export async function getWorkspaceByChannel(channelID: string): Promise<WorkspaceByChannelResponse> {
	return apiGet<WorkspaceByChannelResponse>(`/workspaces/by-channel/${encodeURIComponent(channelID)}`);
}

/**
 * createWorkspace creates a Campfire workspace.
 */
export async function createWorkspace(request: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> {
	return apiPost<CreateWorkspaceRequest, CreateWorkspaceResponse>('/workspaces', request);
}

/**
 * listGlobalSkipDates loads global Campfire holidays/off-days.
 */
export async function listGlobalSkipDates(): Promise<ListGlobalSkipDatesResponse> {
	return apiGet<ListGlobalSkipDatesResponse>('/settings/global/skip-dates');
}

/**
 * createGlobalSkipDate creates a global Campfire holiday/off-day.
 */
export async function createGlobalSkipDate(
	request: CreateGlobalSkipDateRequest,
): Promise<CreateGlobalSkipDateResponse> {
	return apiPost<CreateGlobalSkipDateRequest, CreateGlobalSkipDateResponse>('/settings/global/skip-dates', request);
}

/**
 * deleteGlobalSkipDate deletes a global Campfire holiday/off-day.
 */
export async function deleteGlobalSkipDate(skipDateID: string): Promise<DeleteGlobalSkipDateResponse> {
	return apiDelete<DeleteGlobalSkipDateResponse>(`/settings/global/skip-dates/${encodeURIComponent(skipDateID)}`);
}

/**
 * validateLeaveRequest validates a leave request before creating it.
 */
export async function validateLeaveRequest(request: ValidateLeaveRequest): Promise<ValidateLeaveResponse> {
	return apiPost<ValidateLeaveRequest, ValidateLeaveResponse>('/leaves/validate', request);
}

/**
 * apiGet performs a typed GET request against the Campfire plugin API.
 */
async function apiGet<TResponse>(path: string): Promise<TResponse> {
	const response = await fetch(`${getAPIBaseURL()}${path}`, {
		credentials: 'same-origin',
		method: 'GET',
	});

	return readResponse<TResponse>(response);
}

/**
 * apiPost performs a typed POST request against the Campfire plugin API.
 */
async function apiPost<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
	const response = await fetch(`${getAPIBaseURL()}${path}`, {
		body: JSON.stringify(body),
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});

	return readResponse<TResponse>(response);
}

/**
 * apiDelete performs a typed DELETE request against the Campfire plugin API.
 */
async function apiDelete<TResponse>(path: string): Promise<TResponse> {
	const response = await fetch(`${getAPIBaseURL()}${path}`, {
		credentials: 'same-origin',
		method: 'DELETE',
	});

	return readResponse<TResponse>(response);
}

/**
 * readResponse parses a JSON response and raises typed API errors.
 */
async function readResponse<TResponse>(response: Response): Promise<TResponse> {
	const body: unknown = await response.json();

	if (!response.ok) {
		if (isApiErrorBody(body)) {
			throw new ApiClientError(body.error.code, body.error.message, response.status);
		}

		throw new ApiClientError('unknown_error', 'Campfire returned an unexpected error.', response.status);
	}

	return body as TResponse;
}

/**
 * getAPIBaseURL returns the Mattermost plugin API base URL.
 */
function getAPIBaseURL(): string {
	const basename = window.basename ?? '';

	return `${basename}/plugins/${pluginID}/api/v1`;
}

/**
 * isApiErrorBody narrows an unknown value to Campfire's API error body.
 */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
	if (!isRecord(value)) {
		return false;
	}

	const error = value.error;

	if (!isRecord(error)) {
		return false;
	}

	return typeof error.code === 'string' && typeof error.message === 'string';
}

/**
 * isRecord narrows an unknown value to a string-keyed object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
