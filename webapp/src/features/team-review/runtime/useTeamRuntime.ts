import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { evaluateStandupDay } from '@/api';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { StandupRunDecision, Workspace } from '@/types/domain';

import { collectRuntimeUserIDs, errorToMessage, getTodayLocalDateString } from './team-runtime.helpers';
import type { TeamRuntimeLoadState } from './team-runtime.types';

/**
 * UseTeamRuntimeInput contains workspace context and refresh behavior.
 */
type UseTeamRuntimeInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * UseTeamRuntimeResult contains runtime decision state and controls.
 */
export type UseTeamRuntimeResult = {
	readonly loadState: TeamRuntimeLoadState;
	readonly date: string;
	readonly decision: StandupRunDecision | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly userIDsForProfiles: readonly string[];
	readonly setDate: (date: string) => void;
	readonly resetToToday: () => void;
};

/**
 * useTeamRuntime owns runtime decision loading for Team Review.
 */
export function useTeamRuntime(input: UseTeamRuntimeInput): UseTeamRuntimeResult {
	const { t } = useI18n();
	const [date, setDate] = useState(getTodayLocalDateString());
	const dateIsValid = date.trim() !== '';

	const runtimeQuery = useQuery({
		queryKey: campfireQueryKeys.teamRuntime(input.workspace.id, date, input.refreshToken),
		enabled: dateIsValid,
		queryFn: async (): Promise<StandupRunDecision> => {
			const response = await evaluateStandupDay(input.workspace.id, date);

			return response.decision;
		},
	});

	const decision = dateIsValid ? runtimeQuery.data ?? null : null;
	const userIDsForProfiles = useMemo(() => collectRuntimeUserIDs(decision), [decision]);

	/**
	 * resetToToday moves the runtime decision date back to today.
	 */
	function resetToToday(): void {
		setDate(getTodayLocalDateString());
	}

	return {
		loadState: resolveTeamRuntimeLoadState(dateIsValid, runtimeQuery.isLoading, runtimeQuery.error),
		date,
		decision,
		message: resolveTeamRuntimeMessage(
			dateIsValid,
			runtimeQuery.error,
			t('teamReview.runtime.validation.dateRequired'),
			t('teamReview.runtime.error.fallback'),
		),
		isBusy: runtimeQuery.isFetching,
		userIDsForProfiles,
		setDate,
		resetToToday,
	};
}

/**
 * resolveTeamRuntimeLoadState maps query state into the runtime workflow state.
 */
function resolveTeamRuntimeLoadState(
	dateIsValid: boolean,
	isLoading: boolean,
	error: unknown,
): TeamRuntimeLoadState {
	if (!dateIsValid || error !== null) {
		return 'error';
	}

	if (isLoading) {
		return 'loading';
	}

	return 'ready';
}

/**
 * resolveTeamRuntimeMessage returns localized validation and query errors.
 */
function resolveTeamRuntimeMessage(
	dateIsValid: boolean,
	error: unknown,
	dateRequiredMessage: string,
	fallbackErrorMessage: string,
): string {
	if (!dateIsValid) {
		return dateRequiredMessage;
	}

	if (error !== null) {
		return errorToMessage(error, fallbackErrorMessage);
	}

	return '';
}
