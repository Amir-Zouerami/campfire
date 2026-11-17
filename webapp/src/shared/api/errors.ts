import { createEventBus } from '@/shared/events/createEventBus';

/**
 * ApiClientError represents a failed API request: a non-2xx response or a network failure.
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

	/**
	 * isNotFound reports whether the server answered that the resource does not exist.
	 */
	public get isNotFound(): boolean {
		return this.status === 404 || this.code === 'not_found';
	}
}

/**
 * ApiFailure describes one failed request for the global error toast.
 */
export type ApiFailure = {
	readonly error: ApiClientError;
	readonly method: string;
	readonly path: string;
};

/**
 * apiFailures carries every failed request that was not marked as silent.
 */
export const apiFailures = createEventBus<ApiFailure>();

/**
 * errorMessageOf converts any thrown value into display text.
 */
export function errorMessageOf(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== '') {
		return error.message;
	}

	return fallback;
}
