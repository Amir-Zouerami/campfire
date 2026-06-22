import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listStandupConfiguration, listStandupSubmissions } from '@/api';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { StandupOccurrenceSummary, StandupQuestion, StandupSubmissionSortMode, Workspace } from '@/types/domain';

import {
	collectStandupReviewUserIDs,
	errorToMessage,
	getTodayLocalDateString,
	questionMapByID,
	submittedPercent,
} from './team-standups.helpers';
import type { TeamStandupsLoadState } from './team-standups.types';

/**
 * UseTeamStandupsInput contains workspace context and refresh behavior.
 */
type UseTeamStandupsInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamStandupReviewSnapshot is the query-owned review data for one occurrence.
 */
type TeamStandupReviewSnapshot = {
	readonly summary: StandupOccurrenceSummary;
	readonly questions: readonly StandupQuestion[];
};

/**
 * UseTeamStandupsResult contains team standup review state and controls.
 */
export type UseTeamStandupsResult = {
	readonly loadState: TeamStandupsLoadState;
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
	readonly summary: StandupOccurrenceSummary | null;
	readonly questions: readonly StandupQuestion[];
	readonly questionsByID: Readonly<Record<string, StandupQuestion>>;
	readonly message: string;
	readonly isBusy: boolean;
	readonly submittedPercent: number;
	readonly userIDsForProfiles: readonly string[];
	readonly setOccurrenceDate: (date: string) => void;
	readonly setSortMode: (sortMode: StandupSubmissionSortMode) => void;
};

/**
 * useTeamStandups owns loading and filter state for Team Review standups.
 *
 * Review data is query-owned so submissions/configuration refetching follows the
 * same cache contract as reports, My Day, and future admin review screens.
 */
export function useTeamStandups(input: UseTeamStandupsInput): UseTeamStandupsResult {
	const { t } = useI18n();
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');

	const reviewQuery = useQuery({
		queryKey: campfireQueryKeys.teamStandupReview(
			input.workspace.id,
			occurrenceDate,
			sortMode,
			input.refreshToken,
		),
		queryFn: async (): Promise<TeamStandupReviewSnapshot> => {
			const [configurationResponse, submissionsResponse] = await Promise.all([
				listStandupConfiguration(input.workspace.id),
				listStandupSubmissions({
					workspaceId: input.workspace.id,
					occurrenceDate,
					sortMode,
				}),
			]);

			return {
				questions: configurationResponse.questions,
				summary: submissionsResponse,
			};
		},
	});

	const snapshot = reviewQuery.data ?? null;
	const summary = snapshot?.summary ?? null;
	const questions = useMemo(() => snapshot?.questions ?? [], [snapshot]);
	const questionsByID = useMemo(() => questionMapByID(questions), [questions]);
	const userIDsForProfiles = useMemo(() => collectStandupReviewUserIDs(summary), [summary]);
	const message = reviewQuery.isError
		? errorToMessage(reviewQuery.error, t('teamReview.standups.error.fallback'))
		: '';

	return {
		loadState: resolveTeamStandupsLoadState(reviewQuery.isLoading, reviewQuery.isError),
		occurrenceDate,
		sortMode,
		summary,
		questions,
		questionsByID,
		message,
		isBusy: reviewQuery.isFetching,
		submittedPercent: submittedPercent(summary),
		userIDsForProfiles,
		setOccurrenceDate,
		setSortMode,
	};
}

/**
 * resolveTeamStandupsLoadState maps query state into the existing UI states.
 */
function resolveTeamStandupsLoadState(isLoading: boolean, isError: boolean): TeamStandupsLoadState {
	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	return 'ready';
}
