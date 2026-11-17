import type { ApiErrorBody } from '@/shared/types/api';
import { isRecord } from '@/shared/lib/guards';

import { ApiClientError, apiFailures } from './errors';

const PLUGIN_ID = 'dev.zouerami.campfire';

/**
 * ApiTarget selects which backend a request is sent to.
 *
 * `plugin` is Campfire's own Go API. `mattermost` is Mattermost's REST API, used
 * only for per-user preferences that Mattermost already stores for us.
 */
export type ApiTarget = 'plugin' | 'mattermost';

/**
 * RequestOptions configures one API request.
 */
export type RequestOptions = {
	readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	readonly body?: unknown;
	readonly target?: ApiTarget;
	/** Aborts the request, typically TanStack Query's cancellation signal. */
	readonly signal?: AbortSignal;
	/** Skips the global error toast when the caller renders the failure itself. */
	readonly silent?: boolean;
};

/**
 * QueryValue is an allowed query-string value.
 */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * requestJson performs a JSON API request and parses the JSON response.
 */
export async function requestJson<ResponseBody>(path: string, options: RequestOptions = {}): Promise<ResponseBody> {
	const response = await send(path, options, 'application/json');
	const text = response.status === 204 ? '' : await response.text();

	return (text.trim() === '' ? {} : JSON.parse(text)) as ResponseBody;
}

/**
 * requestBlob performs a file-download request (CSV exports).
 */
export async function requestBlob(path: string, options: Pick<RequestOptions, 'signal'> = {}): Promise<Blob> {
	const response = await send(path, { ...options, method: 'GET' }, 'text/csv, application/octet-stream, */*');

	return response.blob();
}

/**
 * withQuery appends non-empty query parameters to a path.
 */
export function withQuery(path: string, query: Readonly<Record<string, QueryValue>>): string {
	const parameters = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value !== null && value !== undefined && value !== '') {
			parameters.set(key, String(value));
		}
	}

	const serialized = parameters.toString();

	return serialized === '' ? path : `${path}?${serialized}`;
}

/**
 * encodePath encodes one URL path segment.
 */
export function encodePath(value: string): string {
	return encodeURIComponent(value);
}

/**
 * send performs the fetch, converts failures to ApiClientError and reports them once.
 */
async function send(path: string, options: RequestOptions, accept: string): Promise<Response> {
	const method = options.method ?? 'GET';
	const hasBody = options.body !== undefined;
	const headers: Record<string, string> = { Accept: accept, 'X-Requested-With': 'XMLHttpRequest' };

	if (method !== 'GET') {
		const csrfToken = readCSRFToken();
		if (csrfToken !== '') {
			headers['X-CSRF-Token'] = csrfToken;
		}
	}

	if (hasBody) {
		headers['Content-Type'] = 'application/json';
	}

	try {
		const response = await fetch(buildURL(path, options.target ?? 'plugin'), {
			method,
			credentials: 'include',
			headers,
			body: hasBody ? JSON.stringify(options.body) : undefined,
			signal: options.signal,
		});

		if (response.ok) {
			return response;
		}

		throw await toApiError(response);
	} catch (error: unknown) {
		if (options.signal?.aborted === true) {
			throw error;
		}

		const apiError = error instanceof ApiClientError ? error : networkError(error);
		if (options.silent !== true) {
			apiFailures.publish({ error: apiError, method, path });
		}

		throw apiError;
	}
}

/**
 * networkError wraps a fetch rejection (offline, DNS, CORS) as an ApiClientError.
 */
function networkError(cause: unknown): ApiClientError {
	const message =
		cause instanceof Error && cause.message.trim() !== ''
			? cause.message
			: 'Campfire could not reach the server. Check your connection and try again.';

	return new ApiClientError('network_error', message, 0);
}

/**
 * toApiError converts a failed response into an ApiClientError using the server's error envelope.
 */
async function toApiError(response: Response): Promise<ApiClientError> {
	const fallback = `Campfire API request failed with HTTP ${response.status}.`;

	try {
		const body: unknown = await response.json();
		if (isApiErrorBody(body)) {
			return new ApiClientError(body.error.code, body.error.message, response.status);
		}

		if (isRecord(body) && typeof body.message === 'string') {
			return new ApiClientError('http_error', body.message, response.status);
		}
	} catch {
		// Non-JSON error body: fall through to the generic message.
	}

	return new ApiClientError('http_error', fallback, response.status);
}

/**
 * isApiErrorBody validates Campfire's `{ error: { code, message } }` envelope.
 */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
	if (!isRecord(value) || !isRecord(value.error)) {
		return false;
	}

	return typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

/**
 * buildURL resolves a request path against the Mattermost site base path.
 */
function buildURL(path: string, target: ApiTarget): string {
	const basename = typeof window.basename === 'string' ? window.basename : '';
	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	return target === 'mattermost' ? `${basename}/api/v4${cleanPath}` : `${basename}/plugins/${PLUGIN_ID}/api/v1${cleanPath}`;
}

/**
 * readCSRFToken reads Mattermost's MMCSRF cookie, which mutating requests must echo.
 */
function readCSRFToken(): string {
	if (typeof document === 'undefined') {
		return '';
	}

	for (const cookie of document.cookie.split(';')) {
		const separator = cookie.indexOf('=');
		if (separator !== -1 && cookie.slice(0, separator).trim() === 'MMCSRF') {
			return decodeURIComponent(cookie.slice(separator + 1).trim());
		}
	}

	return '';
}
