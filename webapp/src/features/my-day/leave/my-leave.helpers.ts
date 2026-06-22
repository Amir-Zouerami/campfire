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
export const leaveDurationModes: readonly LeaveDurationMode[] = ['full_day', 'hourly'];

/**
 * leaveHalfDayParts lists supported half-day parts.
 */
export const leaveHalfDayParts: readonly LeaveHalfDayPart[] = ['morning', 'afternoon'];

/**
 * MyLeaveValidationText contains localized validation messages for leave forms.
 */
export type MyLeaveValidationText = {
	readonly chooseLeaveType: string;
	readonly startDateRequired: string;
	readonly endDateRequired: string;
	readonly endBeforeStart: string;
	readonly chooseHalfDayPart: string;
	readonly hourlyTimesRequired: string;
	readonly hourlyEndAfterStart: string;
};

/**
 * MyLeaveWarningText contains localized warning message templates.
 */
export type MyLeaveWarningText = {
	readonly ownOverlap: string;
	readonly approvedOverlapOne: string;
	readonly approvedOverlapMany: (count: number) => string;
};

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
		canContactIfNeeded: false,
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
 * validateLeaveDraft returns a localized user-facing validation error when the
 * form is incomplete.
 */
export function validateLeaveDraft(draft: MyLeaveDraft, text: MyLeaveValidationText): string | null {
	if (draft.leaveTypeId.trim() === '') {
		return text.chooseLeaveType;
	}

	if (draft.startDate.trim() === '') {
		return text.startDateRequired;
	}

	if (draft.endDate.trim() === '') {
		return text.endDateRequired;
	}

	if (draft.endDate < draft.startDate) {
		return text.endBeforeStart;
	}

	if (draft.durationMode === 'half_day' && draft.halfDayPart === '') {
		return text.chooseHalfDayPart;
	}

	if (draft.durationMode === 'hourly') {
		if (draft.startTime.trim() === '' || draft.endTime.trim() === '') {
			return text.hourlyTimesRequired;
		}

		if (draft.endTime <= draft.startTime) {
			return text.hourlyEndAfterStart;
		}
	}

	return null;
}

/**
 * localLeaveWarnings returns simple localized local warnings before backend validation.
 */
export function localLeaveWarnings(
	draft: MyLeaveDraft,
	myActiveLeaves: readonly PendingLeaveRequest[],
	approvedLeaves: readonly ApprovedLeaveRequest[],
	text: MyLeaveWarningText,
): readonly MyLeaveWarning[] {
	if (!draftHasDateRange(draft)) {
		return [];
	}

	const warnings: MyLeaveWarning[] = [];

	const ownOverlap = myActiveLeaves.some(item => rangesOverlap(draft.startDate, draft.endDate, item.leaveRequest));
	if (ownOverlap) {
		warnings.push({
			kind: 'local',
			message: text.ownOverlap,
		});
	}

	if (approvedLeaves.length > 0) {
		warnings.push({
			kind: 'local',
			message: approvedLeaves.length === 1 ? text.approvedOverlapOne : text.approvedOverlapMany(approvedLeaves.length),
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
 * formatLeaveRange returns a compact leave date range.
 */
export function formatLeaveRange(leaveRequest: LeaveRequest): string {
	if (leaveRequest.startDate === leaveRequest.endDate) {
		return leaveRequest.startDate;
	}

	return `${leaveRequest.startDate} → ${leaveRequest.endDate}`;
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
export function errorToMessage(error: unknown, fallbackMessage: string): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

