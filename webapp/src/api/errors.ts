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
