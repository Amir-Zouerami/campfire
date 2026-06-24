import type { CreateTimeEntryRequest, CreateTimeEntryResponse, DeleteTimeEntryResponse, ListMyTimeEntriesResponse } from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * listMyTimeEntries calls GET /workspaces/{workspaceID}/time-entries/my.
 */
export function listMyTimeEntries(
	workspaceID: string,
	startDate: string,
	endDate: string,
): Promise<ListMyTimeEntriesResponse> {
	return requestJson<ListMyTimeEntriesResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/time-entries/my`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * createTimeEntry calls POST /workspaces/{workspaceID}/time-entries.
 */
export function createTimeEntry(
	workspaceID: string,
	request: CreateTimeEntryRequest,
): Promise<CreateTimeEntryResponse> {
	return requestJson<CreateTimeEntryResponse>(`/workspaces/${encodePath(workspaceID)}/time-entries`, {
		method: 'POST',
		body: request,
	});
}

/**
 * deleteTimeEntry calls DELETE /workspaces/{workspaceID}/time-entries/{timeEntryID}.
 */
export function deleteTimeEntry(
	workspaceID: string,
	timeEntryID: string,
): Promise<DeleteTimeEntryResponse> {
	return requestJson<DeleteTimeEntryResponse>(
		`/workspaces/${encodePath(workspaceID)}/time-entries/${encodePath(timeEntryID)}`,
		{ method: 'DELETE' },
	);
}
