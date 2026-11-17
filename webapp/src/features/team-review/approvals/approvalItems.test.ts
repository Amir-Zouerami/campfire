import { describe, expect, it } from 'vitest';

import type { LeaveChangeRequest, PendingLeaveChangeRequest, PendingLeaveRequest } from '@/shared/types/domain';

import { approvalItems } from './approvalItems';

const request = (id: string, createdAt: string): PendingLeaveRequest => ({
	leaveTypeName: 'Sick',
	leaveTypeColor: '',
	leaveRequest: {
		id,
		workspaceId: 'w',
		userId: `user-${id}`,
		leaveTypeId: 't',
		startDate: '2026-11-18',
		endDate: '2026-11-18',
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		reason: '',
		backupUserId: '',
		canContactIfNeeded: true,
		status: 'pending',
		createdAt,
		updatedAt: '',
		cancelledAt: '',
	},
});

const change = (id: string, action: LeaveChangeRequest['action']): PendingLeaveChangeRequest => ({
	leaveTypeName: 'Personal',
	leaveTypeColor: '',
	changeRequest: {
		id,
		leaveRequestId: 'l',
		workspaceId: 'w',
		requesterUserId: `requester-${id}`,
		action,
		leaveTypeId: 't',
		startDate: '2026-11-20',
		endDate: '2026-11-20',
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		reason: 'r',
		backupUserId: '',
		canContactIfNeeded: false,
		status: 'pending',
		createdBy: '',
		decidedBy: '',
		decisionComment: '',
		createdAt: '2026-11-10T00:00:00Z',
		updatedAt: '',
		decidedAt: '',
	},
});

describe('approvalItems', () => {
	it('orders queues new, edit, delete and newest first within a queue', () => {
		const items = approvalItems(
			[request('a', '2026-11-01T00:00:00Z'), request('b', '2026-11-05T00:00:00Z')],
			[change('d', 'delete'), change('e', 'edit')],
		);

		expect(items.map(item => item.key)).toEqual(['new:b', 'new:a', 'edit:e', 'delete:d']);
		expect(items[2]).toMatchObject({ kind: 'edit', userID: 'requester-e', decisionID: 'e' });
	});
});
