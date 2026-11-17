import { describe, expect, it } from 'vitest';

import type { ApprovedLeaveRequest } from '@/shared/types/domain';

import { defaultRange, isValidRange, leavesInRange, leavesOnDate, weekGridRows } from './availability';

function approved(id: string, userId: string, startDate: string, endDate: string): ApprovedLeaveRequest {
	return {
		leaveTypeName: 'Sick',
		leaveTypeColor: '',
		leaveRequest: {
			id,
			workspaceId: 'w',
			userId,
			leaveTypeId: 't',
			startDate,
			endDate,
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
		},
	};
}

describe('availability', () => {
	const leaves = [
		approved('1', 'sara', '2026-11-18', '2026-11-18'),
		approved('2', 'parsa', '2026-11-15', '2026-11-17'),
		approved('3', 'leila', '2026-11-30', '2026-12-02'),
	];
	const week = { startDate: '2026-11-14', endDate: '2026-11-20' };

	it('finds who is out on a date and in a range', () => {
		expect(leavesOnDate(leaves, '2026-11-16').map(item => item.leaveRequest.userId)).toEqual(['parsa']);
		expect(leavesInRange(leaves, week).map(item => item.leaveRequest.id)).toEqual(['1', '2']);
	});

	it('clips bars to the visible week', () => {
		const rows = weekGridRows(
			[approved('9', 'nima', '2026-11-10', '2026-11-16')],
			week,
			userID => userID,
			() => 'Sick',
		);
		expect(rows[0]?.spans[0]).toMatchObject({ start: 0, length: 3 });
	});

	it('validates ranges and builds the default window', () => {
		expect(isValidRange({ startDate: '2026-11-16', endDate: '2026-11-15' })).toBe(false);
		expect(isValidRange({ startDate: '', endDate: '2026-11-15' })).toBe(false);
		expect(defaultRange('2026-11-16')).toEqual({ startDate: '2026-11-16', endDate: '2026-12-16' });
	});
});
