import { useQuery } from '@tanstack/react-query';

import { listLeaveTypes } from '@/shared/api';
import type { TFunction, TranslationKey } from '@/shared/i18n';
import type { StatusKind } from '@/shared/ui';
import type { QueryKey } from '@/shared/query/keys';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { LeaveRequest, LeaveStatus, LeaveType } from '@/shared/types/domain';

/**
 * leaveKeys are the cache keys for leave data. Invalidating `leaveKeys.all` refreshes
 * the member's own leave, the approval queues and availability together.
 */
export const leaveKeys = {
	all: (workspaceID: string): QueryKey => workspaceKey(workspaceID, 'leave'),
	types: (workspaceID: string): QueryKey => [...leaveKeys.all(workspaceID), 'types'],
	mine: (workspaceID: string): QueryKey => [...leaveKeys.all(workspaceID), 'mine'],
	approved: (workspaceID: string, startDate: string, endDate: string): QueryKey => [
		...leaveKeys.all(workspaceID),
		'approved',
		startDate,
		endDate,
	],
	pending: (workspaceID: string): QueryKey => [...leaveKeys.all(workspaceID), 'pending'],
	changeRequests: (workspaceID: string): QueryKey => [...leaveKeys.all(workspaceID), 'change-requests'],
};

/**
 * useLeaveTypes loads the workspace's leave types.
 */
export function useLeaveTypes() {
	const workspaceID = useWorkspaceID();

	return useQuery({
		queryKey: leaveKeys.types(workspaceID),
		queryFn: async () => (await listLeaveTypes(workspaceID)).leaveTypes,
		staleTime: 5 * 60_000,
	});
}

/**
 * normalizeToken makes seeded leave-type matching resilient to punctuation and case.
 */
function normalizeToken(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function typeToken(leaveType: { readonly code?: string; readonly name: string }): string {
	const code = normalizeToken(leaveType.code ?? '');

	return code === '' ? normalizeToken(leaveType.name) : code;
}

/**
 * leaveTypeName translates the built-in leave types (Personal, Sick, WFH/Remote) and keeps
 * the names of any custom type an admin created.
 */
export function leaveTypeName(t: TFunction, leaveType: { readonly code?: string; readonly name: string }): string {
	switch (typeToken(leaveType)) {
		case 'vacation':
		case 'custom':
		case 'personal':
			return t('myDay.leave.type.personal');
		case 'sick':
			return t('myDay.leave.type.sick');
		case 'remote_wfh':
		case 'remote':
		case 'wfh':
			return t('myDay.leave.type.remoteWfh');
		default:
			return leaveType.name;
	}
}

/**
 * isSelectableLeaveType reports whether new requests may use a type. Vacation and custom are
 * folded into Personal and hidden from the request forms, but existing requests still show them.
 */
export function isSelectableLeaveType(leaveType: Pick<LeaveType, 'code' | 'name'>): boolean {
	return ['sick', 'personal', 'remote_wfh', 'remote', 'wfh'].includes(typeToken(leaveType));
}

/**
 * leaveStatusKey maps a leave status to its translated label.
 */
export function leaveStatusKey(status: LeaveStatus): TranslationKey {
	return `myDay.leave.status.${status}`;
}

/**
 * leaveStatusKind picks the status dot for a leave status.
 */
export function leaveStatusKind(status: LeaveStatus): StatusKind {
	switch (status) {
		case 'approved':
			return 'approved';
		case 'pending':
			return 'pending';
		case 'rejected':
			return 'rejected';
		case 'cancelled':
			return 'inactive';
	}
}

/**
 * leaveDurationText describes how much of the day a leave covers ("Full day", "09:00 → 13:00").
 */
export function leaveDurationText(t: TFunction, leave: LeaveRequest): string {
	switch (leave.durationMode) {
		case 'half_day':
			return leave.halfDayPart === ''
				? t('myDay.leave.duration.halfDay')
				: t('myDay.leave.duration.halfDayWithPart', {
						part: t(leave.halfDayPart === 'morning' ? 'myDay.leave.halfDay.morning' : 'myDay.leave.halfDay.afternoon'),
					});
		case 'hourly':
			return t('myDay.leave.duration.hourlyRange', { startTime: leave.startTime, endTime: leave.endTime });
		case 'full_day':
			return t('myDay.leave.duration.fullDay');
	}
}

/**
 * leaveRangeText renders a leave's date range ("2026-11-17" or "2026-11-17 → 2026-11-18").
 */
export function leaveRangeText(leave: Pick<LeaveRequest, 'startDate' | 'endDate'>): string {
	return leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} → ${leave.endDate}`;
}
