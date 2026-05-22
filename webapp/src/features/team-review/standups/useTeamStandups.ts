import { useEffect, useMemo, useState } from 'react';

import { listStandupConfiguration, listStandupSubmissions } from '@/api';
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
 */
export function useTeamStandups(input: UseTeamStandupsInput): UseTeamStandupsResult {
	const [loadState, setLoadState] = useState<TeamStandupsLoadState>('idle');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [summary, setSummary] = useState<StandupOccurrenceSummary | null>(null);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadStandupReview loads configuration and occurrence submissions.
		 */
		async function loadStandupReview(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [configurationResponse, submissionsResponse] = await Promise.all([
					listStandupConfiguration(input.workspace.id),
					listStandupSubmissions({
						workspaceId: input.workspace.id,
						occurrenceDate,
						sortMode,
					}),
				]);

				if (!isActive) {
					return;
				}

				setQuestions(configurationResponse.questions);
				setSummary(submissionsResponse);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadStandupReview();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken, occurrenceDate, sortMode]);

	const questionsByID = useMemo(() => questionMapByID(questions), [questions]);
	const userIDsForProfiles = useMemo(() => collectStandupReviewUserIDs(summary), [summary]);

	return {
		loadState,
		occurrenceDate,
		sortMode,
		summary,
		questions,
		questionsByID,
		message,
		isBusy: loadState === 'loading',
		submittedPercent: submittedPercent(summary),
		userIDsForProfiles,
		setOccurrenceDate,
		setSortMode,
	};
}
