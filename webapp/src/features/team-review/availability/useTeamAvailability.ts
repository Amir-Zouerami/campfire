import { useEffect, useMemo, useState } from 'react';

import { listApprovedLeaveRequests } from '@/api';
import type { ApprovedLeaveRequest, Workspace } from '@/types/domain';

import {
	currentWeekRange,
	dateRangeIsValid,
	defaultAvailabilityRange,
	errorToMessage,
	filterLeavesForDate,
	filterLeavesForRange,
	getTodayLocalDateString,
} from './team-availability.helpers';
import type { TeamAvailabilityLoadState, TeamAvailabilityRange } from './team-availability.types';

/**
 * UseTeamAvailabilityInput contains workspace context and refresh behavior.
 */
type UseTeamAvailabilityInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * UseTeamAvailabilityResult contains team availability data and controls.
 */
export type UseTeamAvailabilityResult = {
	readonly loadState: TeamAvailabilityLoadState;
	readonly range: TeamAvailabilityRange;
	readonly today: string;
	readonly weekRange: TeamAvailabilityRange;
	readonly leaveRequests: readonly ApprovedLeaveRequest[];
	readonly todayLeaves: readonly ApprovedLeaveRequest[];
	readonly weekLeaves: readonly ApprovedLeaveRequest[];
	readonly message: string;
	readonly isBusy: boolean;
	readonly updateRange: (patch: Partial<TeamAvailabilityRange>) => void;
};

/**
 * useTeamAvailability owns approved leave loading for the Team Review availability page.
 */
export function useTeamAvailability(input: UseTeamAvailabilityInput): UseTeamAvailabilityResult {
	const today = getTodayLocalDateString();
	const weekRange = useMemo(() => currentWeekRange(today), [today]);

	const [range, setRange] = useState<TeamAvailabilityRange>(defaultAvailabilityRange);
	const [loadState, setLoadState] = useState<TeamAvailabilityLoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly ApprovedLeaveRequest[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadApprovedLeaves loads approved leave rows for the selected date range.
		 */
		async function loadApprovedLeaves(): Promise<void> {
			if (!dateRangeIsValid(range)) {
				setLoadState('error');
				setMessage('Choose a valid start and end date.');
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await listApprovedLeaveRequests(input.workspace.id, range.startDate, range.endDate);

				if (!isActive) {
					return;
				}

				setLeaveRequests(response.leaveRequests);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadApprovedLeaves();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken, range.startDate, range.endDate]);

	const todayLeaves = useMemo(() => {
		return filterLeavesForDate(leaveRequests, today);
	}, [leaveRequests, today]);

	const weekLeaves = useMemo(() => {
		return filterLeavesForRange(leaveRequests, weekRange);
	}, [leaveRequests, weekRange]);

	/**
	 * updateRange patches the selected availability date range.
	 */
	function updateRange(patch: Partial<TeamAvailabilityRange>): void {
		setRange(current => ({
			...current,
			...patch,
		}));
	}

	return {
		loadState,
		range,
		today,
		weekRange,
		leaveRequests,
		todayLeaves,
		weekLeaves,
		message,
		isBusy: loadState === 'loading',
		updateRange,
	};
}
