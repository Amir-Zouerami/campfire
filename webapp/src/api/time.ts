import type { CreateTimeEntryRequest, CreateTimeEntryResponse, ListMyTimeEntriesResponse } from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * listMyTimeEntries calls GET /workspaces/{workspaceID}/time/my.
 */
export function listMyTimeEntries(
	workspaceID: string,
	startDate: string,
	endDate: string,
): Promise<ListMyTimeEntriesResponse> {
	return requestJson<ListMyTimeEntriesResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/time/my`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * createTimeEntry calls POST /workspaces/{workspaceID}/time.
 */
export function createTimeEntry(
	workspaceID: string,
	request: CreateTimeEntryRequest,
): Promise<CreateTimeEntryResponse> {
	return requestJson<CreateTimeEntryResponse>(`/workspaces/${encodePath(workspaceID)}/time`, {
		method: 'POST',
		body: request,
	});
}
