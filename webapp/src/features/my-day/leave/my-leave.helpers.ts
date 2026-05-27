import { ApiClientError } from '@/api';
import type {
	ApprovedLeaveRequest,
	LeaveDurationMode,
	LeaveHalfDayPart,
	LeaveRequest,
	LeaveStatus,
	PendingLeaveRequest,
} from '@/types/domain';

import type { MyLeaveDraft, MyLeaveWarning } from './my-leave.types';

/**
 * leaveDurationModes lists supported leave duration modes.
 */
export const leaveDurationModes: readonly LeaveDurationMode[] = ['full_day', 'half_day', 'hourly'];

/**
 * leaveHalfDayParts lists supported half-day parts.
 */
export const leaveHalfDayParts: readonly LeaveHalfDayPart[] = ['morning', 'afternoon'];

/**
 * emptyLeaveDraft returns the default leave request form state.
 */
export function emptyLeaveDraft(): MyLeaveDraft {
	return {
		leaveTypeId: '',
		startDate: getTodayLocalDateString(),
		endDate: getTodayLocalDateString(),
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		reason: '',
		backupUserId: '',
	};
}

/**
 * getTodayLocalDateString returns today's local date as YYYY-MM-DD.
 */
export function getTodayLocalDateString(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * draftHasDateRange returns whether the leave draft has a useful date range.
 */
export function draftHasDateRange(draft: MyLeaveDraft): boolean {
	return draft.startDate.trim() !== '' && draft.endDate.trim() !== '';
}

/**
 * normalizeLeaveDraftForMode clears fields that do not apply to the selected mode.
 */
export function normalizeLeaveDraftForMode(draft: MyLeaveDraft): MyLeaveDraft {
	switch (draft.durationMode) {
		case 'full_day':
			return {
				...draft,
				halfDayPart: '',
				startTime: '',
				endTime: '',
			};

		case 'half_day':
			return {
				...draft,
				startTime: '',
				endTime: '',
			};

		case 'hourly':
			return {
				...draft,
				halfDayPart: '',
			};
	}
}

/**
 * validateLeaveDraft returns a user-facing validation error when the form is incomplete.
 */
export function validateLeaveDraft(draft: MyLeaveDraft): string | null {
	if (draft.leaveTypeId.trim() === '') {
		return 'Choose a leave type.';
	}

	if (draft.startDate.trim() === '') {
		return 'Start date is required.';
	}

	if (draft.endDate.trim() === '') {
		return 'End date is required.';
	}

	if (draft.endDate < draft.startDate) {
		return 'End date cannot be before start date.';
	}

	if (draft.durationMode === 'half_day' && draft.halfDayPart === '') {
		return 'Choose morning or afternoon for half-day leave.';
	}

	if (draft.durationMode === 'hourly') {
		if (draft.startTime.trim() === '' || draft.endTime.trim() === '') {
			return 'Start time and end time are required for hourly leave.';
		}

		if (draft.endTime <= draft.startTime) {
			return 'Hourly leave end time must be after start time.';
		}
	}

	return null;
}

/**
 * localLeaveWarnings returns simple local warnings before backend validation.
 */
export function localLeaveWarnings(
	draft: MyLeaveDraft,
	myActiveLeaves: readonly PendingLeaveRequest[],
	approvedLeaves: readonly ApprovedLeaveRequest[],
): readonly MyLeaveWarning[] {
	if (!draftHasDateRange(draft)) {
		return [];
	}

	const warnings: MyLeaveWarning[] = [];

	const ownOverlap = myActiveLeaves.some(item => rangesOverlap(draft.startDate, draft.endDate, item.leaveRequest));
	if (ownOverlap) {
		warnings.push({
			kind: 'local',
			message: 'You already have an active leave request overlapping this date range.',
		});
	}

	if (approvedLeaves.length > 0) {
		warnings.push({
			kind: 'local',
			message: `${approvedLeaves.length} approved leave request${approvedLeaves.length === 1 ? '' : 's'} already overlap this range.`,
		});
	}

	return warnings;
}

/**
 * rangesOverlap returns whether a draft date range overlaps a leave request.
 */
export function rangesOverlap(startDate: string, endDate: string, leaveRequest: LeaveRequest): boolean {
	return startDate <= leaveRequest.endDate && endDate >= leaveRequest.startDate;
}

/**
 * formatDurationMode returns a readable duration mode.
 */
export function formatDurationMode(mode: LeaveDurationMode): string {
	return formatLabel(mode);
}

/**
 * formatLeaveStatus returns a readable leave status.
 */
export function formatLeaveStatus(status: LeaveStatus): string {
	return formatLabel(status);
}

/**
 * formatLeaveRange returns a compact leave date range.
 */
export function formatLeaveRange(leaveRequest: LeaveRequest): string {
	if (leaveRequest.startDate === leaveRequest.endDate) {
		return leaveRequest.startDate;
	}

	return `${leaveRequest.startDate} → ${leaveRequest.endDate}`;
}

/**
 * formatLeaveDurationDetails returns compact duration-specific display text.
 */
export function formatLeaveDurationDetails(leaveRequest: LeaveRequest): string {
	switch (leaveRequest.durationMode) {
		case 'half_day':
			return leaveRequest.halfDayPart === '' ? 'Half day' : `Half day · ${formatLabel(leaveRequest.halfDayPart)}`;

		case 'hourly':
			return `${leaveRequest.startTime} → ${leaveRequest.endTime}`;

		case 'full_day':
			return 'Full day';
	}
}

/**
 * leaveStatusTone returns a Campfire status tone for a leave status.
 */
export function leaveStatusTone(status: LeaveStatus): 'green' | 'ember' | 'red' | 'slate' {
	switch (status) {
		case 'approved':
			return 'green';

		case 'pending':
			return 'ember';

		case 'rejected':
			return 'red';

		case 'cancelled':
			return 'slate';
	}
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update your leave request.';
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * formatLeaveOptionLabel converts leave enum-like values to readable labels.
 */
export function formatLeaveOptionLabel(value: string): string {
	return formatLabel(value);
}
