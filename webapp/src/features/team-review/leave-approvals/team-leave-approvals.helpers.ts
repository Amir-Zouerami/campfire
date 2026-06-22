import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { PendingLeaveChangeRequest, PendingLeaveRequest } from '@/types/domain';

/**
 * collectLeaveApprovalUserIDs returns unique user IDs needed by approval rows.
 */
export function collectLeaveApprovalUserIDs(
	requests: readonly PendingLeaveRequest[],
	changeRequests: readonly PendingLeaveChangeRequest[] = [],
): readonly string[] {
	return uniqueStrings([
		...requests.flatMap(item => [item.leaveRequest.userId, item.leaveRequest.backupUserId]),
		...changeRequests.flatMap(item => [item.changeRequest.requesterUserId, item.changeRequest.backupUserId]),
	]);
}

/**
 * approvalCardClassName returns the row card style for approval requests.
 */
export function approvalCardClassName(): string {
	return cn(
		'campfire-approval-card-compact cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.032] cf:p-3',
		'cf:shadow-[0_10px_32px_rgba(0,0,0,0.14)]',
	);
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

/**
 * errorIsPermissionDenied returns whether an API error should hide the approval queue.
 */
export function errorIsPermissionDenied(error: unknown): boolean {
	return error instanceof ApiClientError && error.code === 'permission_denied';
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}