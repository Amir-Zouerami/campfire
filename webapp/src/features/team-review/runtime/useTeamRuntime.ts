import { useEffect, useMemo, useState } from 'react';

import { evaluateStandupDay } from '@/api';
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
	const [date, setDate] = useState(getTodayLocalDateString());
	const [loadState, setLoadState] = useState<TeamRuntimeLoadState>('idle');
	const [decision, setDecision] = useState<StandupRunDecision | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadDecision evaluates whether standup automation should run for the selected date.
		 */
		async function loadDecision(): Promise<void> {
			if (date.trim() === '') {
				setDecision(null);
				setLoadState('error');
				setMessage('Choose a date.');
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await evaluateStandupDay(input.workspace.id, date);

				if (!isActive) {
					return;
				}

				setDecision(response.decision);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setDecision(null);
				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadDecision();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken, date]);

	const userIDsForProfiles = useMemo(() => {
		return collectRuntimeUserIDs(decision);
	}, [decision]);

	/**
	 * resetToToday moves the runtime decision date back to today.
	 */
	function resetToToday(): void {
		setDate(getTodayLocalDateString());
	}

	return {
		loadState,
		date,
		decision,
		message,
		isBusy: loadState === 'loading',
		userIDsForProfiles,
		setDate,
		resetToToday,
	};
}
