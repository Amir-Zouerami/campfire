import { describe, expect, it } from 'vitest';

import type { LeaveRequest } from '@/shared/types/domain';

import { approvedLeaveHasStarted, draftFromLeave, emptyLeaveDraft, leaveDraftSchema, leavesOverlap, normalizeDraft } from './leaveDraft';

function leave(overrides: Partial<LeaveRequest>): LeaveRequest {
	return {
		id: 'l',
		workspaceId: 'w',
		userId: 'u',
		leaveTypeId: 't',
		startDate: '2026-11-20',
		endDate: '2026-11-20',
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		reason: '',
		backupUserId: '',
		canContactIfNeeded: false,
		status: 'approved',
		createdAt: '',
		updatedAt: '',
		cancelledAt: '',
		...overrides,
	};
}

const issues = (draft: Parameters<typeof leaveDraftSchema.safeParse>[0]): string[] => {
	const result = leaveDraftSchema.safeParse(draft);

	return result.success ? [] : result.error.issues.map(issue => `${issue.path.join('.')}:${issue.message}`);
};

describe('leave draft', () => {
	const base = emptyLeaveDraft('2026-11-16', 'type-1');

	it('accepts a valid full-day request', () => {
		expect(issues(base)).toEqual([]);
	});

	it('requires a type and a valid date order', () => {
		expect(issues({ ...base, leaveTypeId: '' })).toEqual(['leaveTypeId:myDay.leave.validation.chooseLeaveType']);
		expect(issues({ ...base, endDate: '2026-11-15' })).toEqual(['endDate:myDay.leave.validation.endBeforeStart']);
	});

	it('validates hourly ranges', () => {
		expect(issues({ ...base, durationMode: 'hourly' })).toEqual(['startTime:myDay.leave.validation.hourlyTimesRequired']);
		expect(issues({ ...base, durationMode: 'hourly', startTime: '14:00', endTime: '09:00' })).toEqual([
			'endTime:myDay.leave.validation.hourlyEndAfterStart',
		]);
		expect(issues({ ...base, durationMode: 'hourly', startTime: '09:00', endTime: '13:00' })).toEqual([]);
	});

	it('clears fields that do not apply to the duration mode', () => {
		expect(
			normalizeDraft({ ...base, durationMode: 'full_day', startTime: '09:00', endTime: '10:00', halfDayPart: 'morning' }),
		).toMatchObject({ startTime: '', endTime: '', halfDayPart: '' });
		expect(draftFromLeave(leave({ durationMode: 'half_day', halfDayPart: 'morning' })).durationMode).toBe('full_day');
	});

	it('detects overlapping ranges', () => {
		expect(leavesOverlap('2026-11-19', '2026-11-20', leave({}))).toBe(true);
		expect(leavesOverlap('2026-11-21', '2026-11-22', leave({}))).toBe(false);
	});

	it('knows when approved leave has started in the workspace timezone', () => {
		const approved = leave({ startDate: '2026-11-20' });
		// 2026-11-20T00:00 in Tehran is 2026-11-19T20:30Z.
		expect(approvedLeaveHasStarted(approved, 'Asia/Tehran', new Date('2026-11-19T20:29:00Z'))).toBe(false);
		expect(approvedLeaveHasStarted(approved, 'Asia/Tehran', new Date('2026-11-19T20:30:00Z'))).toBe(true);
		expect(approvedLeaveHasStarted(leave({ status: 'pending' }), 'UTC', new Date('2030-01-01T00:00:00Z'))).toBe(false);
	});
});
