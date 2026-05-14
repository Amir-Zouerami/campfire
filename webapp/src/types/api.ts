/**
 * HealthResponse is returned by GET /api/v1/health.
 */
export type HealthResponse = {
	readonly status: string;
	readonly product: string;
	readonly version: string;
};

/**
 * MeUserResponse contains the current Mattermost user's public identity.
 */
export type MeUserResponse = {
	readonly id: string;
	readonly username: string;
	readonly displayName: string;
	readonly email: string;
};

/**
 * MeResponse is returned by GET /api/v1/me.
 */
export type MeResponse = {
	readonly user: MeUserResponse;
	readonly isSystemAdmin: boolean;
};

/**
 * ApiErrorPayload is the standard Campfire API error payload.
 */
export type ApiErrorPayload = {
	readonly code: string;
	readonly message: string;
};

/**
 * ApiErrorBody is the standard Campfire API error response body.
 */
export type ApiErrorBody = {
	readonly error: ApiErrorPayload;
};
