import type { ApiErrorBody } from '@/types/api';

import { ApiClientError, publishAPIError } from './errors';

/**
 * RequestOptions contains fetch options used by the API client.
 */
type RequestOptions = {
	readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	readonly body?: unknown;
};

/**
 * QueryValue is an allowed query parameter value.
 */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * requestJson performs a JSON API request.
 */
export async function requestJson<ResponseBody>(path: string, options: RequestOptions = {}): Promise<ResponseBody> {
	const method = options.method ?? 'GET';
	const response = await safeFetch(path, method, {
		method,
		credentials: 'include',
		headers: buildHeaders(method, options.body),
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});

	if (!response.ok) {
		const error = await buildAPIError(response);
		publishAPIError(error, { method, path });
		throw error;
	}

	if (response.status === 204) {
		return {} as ResponseBody;
	}

	const text = await response.text();
	if (text.trim() === '') {
		return {} as ResponseBody;
	}

	return JSON.parse(text) as ResponseBody;
}

/**
 * requestBlob performs a file-download API request.
 */
export async function requestBlob(path: string): Promise<Blob> {
	const method = 'GET';
	const response = await safeFetch(path, method, {
		method,
		credentials: 'include',
		headers: {
			Accept: 'text/csv, application/octet-stream, */*',
		},
	});

	if (!response.ok) {
		const error = await buildAPIError(response);
		publishAPIError(error, { method, path });
		throw error;
	}

	return response.blob();
}

/**
 * withQuery appends query parameters to a path.
 */
export function withQuery(path: string, query: Readonly<Record<string, QueryValue>>): string {
	const parameters = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value === null || value === undefined || value === '') {
			continue;
		}

		parameters.set(key, String(value));
	}

	const serialized = parameters.toString();
	if (serialized === '') {
		return path;
	}

	return `${path}?${serialized}`;
}

/**
 * encodePath safely encodes one URL path segment.
 */
export function encodePath(value: string): string {
	return encodeURIComponent(value);
}


/**
 * safeFetch converts network-level failures into the same ApiClientError path as server failures.
 */
async function safeFetch(path: string, method: string, init: RequestInit): Promise<Response> {
	try {
		return await fetch(buildURL(path), init);
	} catch (error: unknown) {
		const message = error instanceof Error && error.message.trim() !== ''
			? error.message
			: 'Campfire could not reach the server. Check your connection and try again.';
		const apiError = new ApiClientError('network_error', message, 0);
		publishAPIError(apiError, { method, path });
		throw apiError;
	}
}

/**
 * buildHeaders returns request headers for JSON API calls.
 */
function buildHeaders(method: string, body: unknown): HeadersInit {
	const baseHeaders: Record<string, string> = {
		Accept: 'application/json',
		'X-Requested-With': 'XMLHttpRequest',
	};

	const csrfToken = csrfTokenFromCookie();
	if (requiresCSRFToken(method) && csrfToken !== '') {
		baseHeaders['X-CSRF-Token'] = csrfToken;
	}

	if (body === undefined) {
		return baseHeaders;
	}

	return {
		...baseHeaders,
		'Content-Type': 'application/json',
	};
}

/**
 * buildAPIError converts a failed response into ApiClientError.
 */
async function buildAPIError(response: Response): Promise<ApiClientError> {
	const fallbackMessage = `Campfire API request failed with HTTP ${response.status}.`;

	try {
		const parsed = (await response.json()) as unknown;

		if (isApiErrorBody(parsed)) {
			return new ApiClientError(parsed.error.code, parsed.error.message, response.status);
		}
	} catch (_error: unknown) {
		return new ApiClientError('http_error', fallbackMessage, response.status);
	}

	return new ApiClientError('http_error', fallbackMessage, response.status);
}

/**
 * isApiErrorBody validates Campfire API error JSON.
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
 * buildURL creates a full plugin API URL.
 */
function buildURL(path: string): string {
	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	return `${getPluginAPIBaseURL()}${cleanPath}`;
}

/**
 * getPluginAPIBaseURL returns the Campfire plugin API base URL.
 */
function getPluginAPIBaseURL(): string {
	const baseName = typeof window.basename === 'string' ? window.basename : '';

	return `${baseName}/plugins/dev.zouerami.campfire/api/v1`;
}

/**
 * requiresCSRFToken reports whether a method mutates Mattermost/plugin state.
 */
function requiresCSRFToken(method: string): boolean {
	return method !== 'GET';
}

/**
 * csrfTokenFromCookie reads Mattermost's browser CSRF token cookie.
 *
 * Mattermost still accepts XMLHttpRequest today, but recent server versions log a
 * migration warning unless plugin webapps send the explicit X-CSRF-Token header.
 */
function csrfTokenFromCookie(): string {
	if (typeof document === 'undefined' || document.cookie.trim() === '') {
		return '';
	}

	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const [rawName, ...rawValueParts] = cookie.split('=');
		if (rawName.trim() !== 'MMCSRF') {
			continue;
		}

		return decodeURIComponent(rawValueParts.join('=').trim());
	}

	return '';
}

/**
 * isRecord narrows unknown values to string-keyed records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}