import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelLeaveRequest, listApprovedLeaveRequests, updateLeaveRequest } from '@/api';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { ApprovedLeaveRequest, LeaveDurationMode, LeaveRequest, TimeOfDay, Workspace } from '@/types/domain';

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
	readonly editLeaveRequest: (leaveRequest: LeaveRequest, patch: TeamAvailabilityLeaveEditPatch) => Promise<void>;
	readonly cancelLeaveRequestByID: (leaveRequestID: string) => Promise<void>;
};

/**
 * TeamAvailabilityLeaveEditPatch contains approver-editable leave scheduling fields.
 */
export type TeamAvailabilityLeaveEditPatch = {
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
};

/**
 * useTeamAvailability owns approved leave loading for the Team Review availability page.
 */
export function useTeamAvailability(input: UseTeamAvailabilityInput): UseTeamAvailabilityResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const today = getTodayLocalDateString();
	const weekRange = useMemo(() => currentWeekRange(today), [today]);
	const [range, setRange] = useState<TeamAvailabilityRange>(defaultAvailabilityRange);
	const rangeIsValid = dateRangeIsValid(range);

	const availabilityQuery = useQuery({
		queryKey: campfireQueryKeys.teamAvailability(
			input.workspace.id,
			range.startDate,
			range.endDate,
			input.refreshToken,
		),
		enabled: rangeIsValid,
		queryFn: async (): Promise<readonly ApprovedLeaveRequest[]> => {
			const response = await listApprovedLeaveRequests(input.workspace.id, range.startDate, range.endDate);

			return response.leaveRequests;
		},
	});

	const leaveRequests = rangeIsValid ? availabilityQuery.data ?? [] : [];
	const editLeaveMutation = useMutation({
		mutationFn: async (input: { readonly leaveRequest: LeaveRequest; readonly patch: TeamAvailabilityLeaveEditPatch }) => {
			return updateLeaveRequest(input.leaveRequest.id, {
				leaveTypeId: input.leaveRequest.leaveTypeId,
				startDate: input.patch.startDate,
				endDate: input.patch.endDate,
				durationMode: input.patch.durationMode,
				halfDayPart: '',
				startTime: input.patch.durationMode === 'hourly' ? input.patch.startTime : '',
				endTime: input.patch.durationMode === 'hourly' ? input.patch.endTime : '',
				reason: input.leaveRequest.reason,
				backupUserId: input.leaveRequest.backupUserId,
				canContactIfNeeded: input.leaveRequest.canContactIfNeeded,
			});
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: campfireQueryKeys.teamReview(input.workspace.id) }),
				queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(input.workspace.id) }),
			]);
		},
	});
	const cancelLeaveMutation = useMutation({
		mutationFn: cancelLeaveRequest,
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: campfireQueryKeys.teamReview(input.workspace.id) }),
				queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(input.workspace.id) }),
			]);
		},
	});

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

	/**
	 * editLeaveRequest lets leads/approvers correct approved leave timing without
	 * reopening requester-owned cancellation rules.
	 */
	async function editLeaveRequest(
		leaveRequest: LeaveRequest,
		patch: TeamAvailabilityLeaveEditPatch,
	): Promise<void> {
		await editLeaveMutation.mutateAsync({ leaveRequest, patch });
	}

	/**
	 * cancelLeaveRequestByID lets leads/approvers remove approved leave rows.
	 */
	async function cancelLeaveRequestByID(leaveRequestID: string): Promise<void> {
		await cancelLeaveMutation.mutateAsync(leaveRequestID);
	}

	return {
		loadState: resolveTeamAvailabilityLoadState(rangeIsValid, availabilityQuery.isLoading, availabilityQuery.isError),
		range,
		today,
		weekRange,
		leaveRequests,
		todayLeaves,
		weekLeaves,
		message: resolveTeamAvailabilityMessage(rangeIsValid, availabilityQuery.error, t('teamReview.availability.error.fallback'), t('teamReview.availability.validation.validRange')),
		isBusy: availabilityQuery.isFetching || editLeaveMutation.isPending || cancelLeaveMutation.isPending,
		updateRange,
		editLeaveRequest,
		cancelLeaveRequestByID,
	};
}

/**
 * resolveTeamAvailabilityLoadState maps query state into the page workflow state.
 */
function resolveTeamAvailabilityLoadState(
	rangeIsValid: boolean,
	isLoading: boolean,
	isError: boolean,
): TeamAvailabilityLoadState {
	if (!rangeIsValid || isError) {
		return 'error';
	}

	if (isLoading) {
		return 'loading';
	}

	return 'ready';
}

/**
 * resolveTeamAvailabilityMessage returns localized validation or query errors.
 */
function resolveTeamAvailabilityMessage(
	rangeIsValid: boolean,
	error: unknown,
	fallbackErrorMessage: string,
	invalidRangeMessage: string,
): string {
	if (!rangeIsValid) {
		return invalidRangeMessage;
	}

	if (error !== null) {
		return errorToMessage(error, fallbackErrorMessage);
	}

	return '';
}