import { useQuery } from '@tanstack/react-query';

import { listStandupSubmissions } from '@/shared/api';
import { standupKeys } from '@/shared/data/standups';
import { useWorkspaceID } from '@/shared/session';
import type { StandupSubmissionSortMode } from '@/shared/types/domain';

/**
 * useTeamStandups loads who submitted, who is missing and everyone's answers for one date.
 */
export function useTeamStandups(occurrenceDate: string, sortMode: StandupSubmissionSortMode) {
	const workspaceID = useWorkspaceID();

	return useQuery({
		queryKey: standupKeys.submissions(workspaceID, occurrenceDate, sortMode),
		queryFn: () => listStandupSubmissions({ workspaceId: workspaceID, occurrenceDate, sortMode }),
		enabled: occurrenceDate !== '',
		staleTime: 15_000,
	});
}
