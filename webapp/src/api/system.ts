import type { HealthResponse, LookupUsersRequest, LookupUsersResponse, MeResponse } from '@/types/api';

import { requestJson } from './http';

/**
 * getHealth calls GET /health.
 */
export function getHealth(): Promise<HealthResponse> {
	return requestJson<HealthResponse>('/health');
}

/**
 * getMe calls GET /me.
 */
export function getMe(): Promise<MeResponse> {
	return requestJson<MeResponse>('/me');
}

/**
 * lookupUsers calls POST /users/lookup.
 */
export function lookupUsers(userIDs: readonly string[]): Promise<LookupUsersResponse> {
	const request: LookupUsersRequest = {
		userIds: userIDs,
	};

	return requestJson<LookupUsersResponse>('/users/lookup', {
		method: 'POST',
		body: request,
	});
}
