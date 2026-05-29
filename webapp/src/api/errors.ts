/**
 * ApiClientError represents a non-2xx API response.
 */
export class ApiClientError extends Error {
	public readonly code: string;
	public readonly status: number;

	public constructor(code: string, message: string, status: number) {
		super(message);
		this.name = 'ApiClientError';
		this.code = code;
		this.status = status;
	}
}

/**
 * CampfireAPIErrorEventDetail is emitted whenever the shared API client receives a failed response.
 */
export type CampfireAPIErrorEventDetail = {
	readonly error: ApiClientError;
	readonly method: string;
	readonly path: string;
};

/**
 * CAMPFIRE_API_ERROR_EVENT is the global browser event consumed by CampfireToastHost.
 */
export const CAMPFIRE_API_ERROR_EVENT = 'campfire:api-error';

/**
 * publishAPIError notifies the UI layer about one failed Campfire API request.
 */
export function publishAPIError(error: ApiClientError, detail: { readonly method: string; readonly path: string }): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<CampfireAPIErrorEventDetail>(CAMPFIRE_API_ERROR_EVENT, {
			detail: {
				error,
				method: detail.method,
				path: detail.path,
			},
		}),
	);
}

/**
 * isCampfireAPIErrorEvent narrows browser events to Campfire API error events.
 */
export function isCampfireAPIErrorEvent(event: Event): event is CustomEvent<CampfireAPIErrorEventDetail> {
	if (event.type !== CAMPFIRE_API_ERROR_EVENT || !(event instanceof CustomEvent)) {
		return false;
	}

	const detail = event.detail as unknown;

	if (!isRecord(detail)) {
		return false;
	}

	return detail.error instanceof ApiClientError && typeof detail.method === 'string' && typeof detail.path === 'string';
}

/**
 * isRecord narrows unknown values to records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
