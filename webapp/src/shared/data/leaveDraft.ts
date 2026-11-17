import * as z from 'zod/mini';

import { msg } from '@/shared/forms/validation';
import type { IsoDate } from '@/shared/lib/date';
import { zonedDateTimeToInstant } from '@/shared/lib/zonedTime';
import type { LeaveRequest } from '@/shared/types/domain';

/**
 * leaveDraftSchema validates a leave request form. Cross-field rules attach their message to
 * the field the person should fix, so each error appears beside the right control.
 */
export const leaveDraftSchema = z
	.object({
		leaveTypeId: z.string().check(z.minLength(1, msg('myDay.leave.validation.chooseLeaveType'))),
		startDate: z.string().check(z.minLength(1, msg('myDay.leave.validation.startDateRequired'))),
		endDate: z.string().check(z.minLength(1, msg('myDay.leave.validation.endDateRequired'))),
		durationMode: z.enum(['full_day', 'half_day', 'hourly']),
		halfDayPart: z.enum(['morning', 'afternoon', '']),
		startTime: z.string(),
		endTime: z.string(),
		backupUserId: z.string(),
		canContactIfNeeded: z.boolean(),
		reason: z.string(),
	})
	.check(
		z.superRefine((draft, context) => {
			if (draft.startDate !== '' && draft.endDate !== '' && draft.endDate < draft.startDate) {
				context.addIssue({ code: 'custom', path: ['endDate'], message: msg('myDay.leave.validation.endBeforeStart') });
			}

			if (draft.durationMode === 'half_day' && draft.halfDayPart === '') {
				context.addIssue({ code: 'custom', path: ['halfDayPart'], message: msg('myDay.leave.validation.chooseHalfDayPart') });
			}

			if (draft.durationMode === 'hourly') {
				if (draft.startTime.trim() === '' || draft.endTime.trim() === '') {
					context.addIssue({ code: 'custom', path: ['startTime'], message: msg('myDay.leave.validation.hourlyTimesRequired') });
				} else if (draft.endTime <= draft.startTime) {
					context.addIssue({ code: 'custom', path: ['endTime'], message: msg('myDay.leave.validation.hourlyEndAfterStart') });
				}
			}
		}),
	);

/**
 * LeaveDraft is the editable state of a leave request form.
 */
export type LeaveDraft = z.infer<typeof leaveDraftSchema>;

/**
 * emptyLeaveDraft is a blank full-day request for a date.
 */
export function emptyLeaveDraft(today: IsoDate, leaveTypeId: string): LeaveDraft {
	return {
		leaveTypeId,
		startDate: today,
		endDate: today,
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		backupUserId: '',
		canContactIfNeeded: false,
		reason: '',
	};
}

/**
 * normalizeDraft clears the fields that do not apply to the chosen duration mode, so stale
 * hourly times are never sent with a full-day request.
 */
export function normalizeDraft(draft: LeaveDraft): LeaveDraft {
	switch (draft.durationMode) {
		case 'full_day':
			return { ...draft, halfDayPart: '', startTime: '', endTime: '' };
		case 'half_day':
			return { ...draft, startTime: '', endTime: '' };
		case 'hourly':
			return { ...draft, halfDayPart: '' };
	}
}

/**
 * draftFromLeave turns an existing request into an editable draft. Half-day leave (no longer
 * offered for new requests) is edited as a full day.
 */
export function draftFromLeave(leave: LeaveRequest): LeaveDraft {
	return normalizeDraft({
		leaveTypeId: leave.leaveTypeId,
		startDate: leave.startDate,
		endDate: leave.endDate,
		durationMode: leave.durationMode === 'half_day' ? 'full_day' : leave.durationMode,
		halfDayPart: leave.halfDayPart,
		startTime: leave.startTime,
		endTime: leave.endTime,
		backupUserId: leave.backupUserId,
		canContactIfNeeded: leave.canContactIfNeeded,
		reason: leave.reason,
	});
}

/**
 * leavesOverlap reports whether a date range overlaps an existing leave request.
 */
export function leavesOverlap(startDate: string, endDate: string, leave: Pick<LeaveRequest, 'startDate' | 'endDate'>): boolean {
	return startDate <= leave.endDate && endDate >= leave.startDate;
}

/**
 * approvedLeaveHasStarted mirrors the backend's gate for the requester deleting approved leave:
 * once the first covered instant (in the workspace timezone) has passed, a deletion must be
 * requested from an approver instead of deleting directly.
 */
export function approvedLeaveHasStarted(leave: LeaveRequest, timezone: string, now: Date = new Date()): boolean {
	if (leave.status !== 'approved') {
		return false;
	}

	let time = '00:00';
	if (leave.durationMode === 'hourly' && leave.startTime.trim() !== '') {
		time = leave.startTime;
	} else if (leave.durationMode === 'half_day' && leave.halfDayPart === 'afternoon') {
		time = '12:00';
	}

	const start = zonedDateTimeToInstant(leave.startDate, time, timezone);

	return start !== null && now.getTime() >= start.getTime();
}
