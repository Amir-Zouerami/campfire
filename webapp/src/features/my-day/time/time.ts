import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTimeEntry, deleteTimeEntry, listMyTimeEntries } from '@/shared/api';
import type { QueryKey } from '@/shared/query/keys';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { CreateTimeEntryRequest } from '@/shared/types/api';

/**
 * timeKeys are the cache keys for the signed-in user's time entries. They live under the same
 * `my-work` prefix as tasks, so one invalidation refreshes both after any change.
 */
export const timeKeys = {
	all: (workspaceID: string): QueryKey => workspaceKey(workspaceID, 'my-work', 'time'),
	range: (workspaceID: string, startDate: string, endDate: string): QueryKey => [...timeKeys.all(workspaceID), startDate, endDate],
};

/**
 * useMyTimeEntries loads the user's time entries in a date range.
 */
export function useMyTimeEntries(startDate: string, endDate: string) {
	const workspaceID = useWorkspaceID();

	return useQuery({
		queryKey: timeKeys.range(workspaceID, startDate, endDate),
		queryFn: async () => (await listMyTimeEntries(workspaceID, startDate, endDate)).timeEntries,
		staleTime: 30_000,
	});
}

/**
 * useTimeMutations returns the log and delete mutations for time entries.
 */
export function useTimeMutations() {
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'my-work') });

	const log = useMutation({
		mutationFn: (request: CreateTimeEntryRequest) => createTimeEntry(workspaceID, request),
		onSuccess: refresh,
	});

	const remove = useMutation({
		mutationFn: (timeEntryID: string) => deleteTimeEntry(workspaceID, timeEntryID),
		onSuccess: refresh,
	});

	return { log, remove };
}
