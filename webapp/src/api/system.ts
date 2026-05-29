import type { HealthResponse, LookupChannelsRequest, LookupChannelsResponse, LookupUsersRequest, LookupUsersResponse, MeResponse, SearchChannelsResponse } from '@/types/api';

import { requestJson, withQuery } from './http';

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


/**
 * lookupChannels calls POST /channels/lookup.
 */
export function lookupChannels(channelIDs: readonly string[]): Promise<LookupChannelsResponse> {
	const request: LookupChannelsRequest = {
		channelIds: channelIDs,
	};

	return requestJson<LookupChannelsResponse>('/channels/lookup', {
		method: 'POST',
		body: request,
	});
}

/**
 * searchChannels calls GET /channels/search.
 */
export function searchChannels(teamID: string, term: string, limit = 20): Promise<SearchChannelsResponse> {
	return requestJson<SearchChannelsResponse>(withQuery('/channels/search', {
		teamId: teamID,
		term,
		limit: String(limit),
	}));
}
