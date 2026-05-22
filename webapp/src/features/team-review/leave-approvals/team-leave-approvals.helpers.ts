import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { LeaveRequest, LeaveStatus, PendingLeaveRequest } from '@/types/domain';

/**
 * collectLeaveApprovalUserIDs returns unique user IDs needed by approval rows.
 */
export function collectLeaveApprovalUserIDs(requests: readonly PendingLeaveRequest[]): readonly string[] {
	return uniqueStrings(requests.flatMap(item => [item.leaveRequest.userId, item.leaveRequest.backupUserId]));
}

/**
 * approvalRangeLabel returns a readable leave date range.
 */
export function approvalRangeLabel(leaveRequest: LeaveRequest): string {
	if (leaveRequest.startDate === leaveRequest.endDate) {
		return leaveRequest.startDate;
	}

	return `${leaveRequest.startDate} → ${leaveRequest.endDate}`;
}

/**
 * approvalDurationLabel returns duration-specific leave details.
 */
export function approvalDurationLabel(leaveRequest: LeaveRequest): string {
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
 * formatLeaveStatus returns a readable leave status.
 */
export function formatLeaveStatus(status: LeaveStatus): string {
	return formatLabel(status);
}

/**
 * formatDurationMode returns a readable leave duration mode.
 */
export function formatDurationMode(value: string): string {
	return formatLabel(value);
}

/**
 * approvalCardClassName returns the row card style for approval requests.
 */
export function approvalCardClassName(): string {
	return cn(
		'cf:grid cf:gap-5 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5',
		'cf:shadow-[0_18px_60px_rgba(0,0,0,0.18)]',
	);
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

	return 'Could not update the leave approval queue.';
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

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
