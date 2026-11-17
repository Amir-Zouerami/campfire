import type { LeaveDurationMode, LeaveHalfDayPart, PendingLeaveChangeRequest, PendingLeaveRequest } from '@/shared/types/domain';

/**
 * ApprovalKind is which queue an item is in, and so which decision it needs:
 * a brand-new request, a member's edit of approved leave, or a member's deletion of approved leave.
 */
export type ApprovalKind = 'new' | 'edit' | 'delete';

/**
 * ApprovalItem is one pending decision, normalized so new requests and change requests
 * can be listed and displayed the same way.
 */
export type ApprovalItem = {
	/** Unique across kinds, e.g. `new:abc`. */
	readonly key: string;
	readonly kind: ApprovalKind;
	/** The leave request (new) or change request (edit/delete) to decide. */
	readonly decisionID: string;
	readonly userID: string;
	readonly leaveTypeName: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: string;
	readonly endTime: string;
	readonly backupUserID: string;
	readonly canContact: boolean;
	readonly reason: string;
	readonly createdAt: string;
};

/**
 * approvalItems merges the pending queues, newest first within each kind.
 */
export function approvalItems(
	requests: readonly PendingLeaveRequest[],
	changes: readonly PendingLeaveChangeRequest[],
): readonly ApprovalItem[] {
	const fromRequest = (item: PendingLeaveRequest): ApprovalItem => ({
		key: `new:${item.leaveRequest.id}`,
		kind: 'new',
		decisionID: item.leaveRequest.id,
		userID: item.leaveRequest.userId,
		leaveTypeName: item.leaveTypeName,
		startDate: item.leaveRequest.startDate,
		endDate: item.leaveRequest.endDate,
		durationMode: item.leaveRequest.durationMode,
		halfDayPart: item.leaveRequest.halfDayPart,
		startTime: item.leaveRequest.startTime,
		endTime: item.leaveRequest.endTime,
		backupUserID: item.leaveRequest.backupUserId,
		canContact: item.leaveRequest.canContactIfNeeded,
		reason: item.leaveRequest.reason,
		createdAt: item.leaveRequest.createdAt,
	});

	const fromChange = (item: PendingLeaveChangeRequest): ApprovalItem => ({
		key: `${item.changeRequest.action}:${item.changeRequest.id}`,
		kind: item.changeRequest.action,
		decisionID: item.changeRequest.id,
		userID: item.changeRequest.requesterUserId,
		leaveTypeName: item.leaveTypeName,
		startDate: item.changeRequest.startDate,
		endDate: item.changeRequest.endDate,
		durationMode: item.changeRequest.durationMode,
		halfDayPart: item.changeRequest.halfDayPart,
		startTime: item.changeRequest.startTime,
		endTime: item.changeRequest.endTime,
		backupUserID: item.changeRequest.backupUserId,
		canContact: item.changeRequest.canContactIfNeeded,
		reason: item.changeRequest.reason,
		createdAt: item.changeRequest.createdAt,
	});

	const newest = (first: ApprovalItem, second: ApprovalItem): number => second.createdAt.localeCompare(first.createdAt);

	return [
		...requests.map(fromRequest).sort(newest),
		...changes
			.filter(item => item.changeRequest.action === 'edit')
			.map(fromChange)
			.sort(newest),
		...changes
			.filter(item => item.changeRequest.action === 'delete')
			.map(fromChange)
			.sort(newest),
	];
}
