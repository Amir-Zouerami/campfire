import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { ApprovedLeaveRequest, LeaveRequest } from '@/types/domain';

import type { TeamAvailabilityRange } from './team-availability.types';

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
 * addDaysToLocalDate returns a YYYY-MM-DD date offset from another local date.
 */
export function addDaysToLocalDate(value: string, days: number): string {
	const [yearRaw, monthRaw, dayRaw] = value.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return value;
	}

	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + days);

	const nextYear = date.getFullYear();
	const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
	const nextDay = String(date.getDate()).padStart(2, '0');

	return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * defaultAvailabilityRange returns a useful initial availability date window.
 */
export function defaultAvailabilityRange(): TeamAvailabilityRange {
	const today = getTodayLocalDateString();

	return {
		startDate: today,
		endDate: addDaysToLocalDate(today, 30),
	};
}

/**
 * currentWeekRange returns the current Monday-to-Sunday local week.
 */
export function currentWeekRange(today: string): TeamAvailabilityRange {
	const [yearRaw, monthRaw, dayRaw] = today.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return {
			startDate: today,
			endDate: today,
		};
	}

	const date = new Date(year, month - 1, day);
	const weekday = date.getDay();
	const mondayOffset = weekday === 0 ? -6 : 1 - weekday;

	return {
		startDate: addDaysToLocalDate(today, mondayOffset),
		endDate: addDaysToLocalDate(today, mondayOffset + 6),
	};
}

/**
 * collectAvailabilityUserIDs returns unique user IDs needed by availability rows.
 */
export function collectAvailabilityUserIDs(requests: readonly ApprovedLeaveRequest[]): readonly string[] {
	return uniqueStrings(requests.flatMap(item => [item.leaveRequest.userId, item.leaveRequest.backupUserId]));
}

/**
 * filterLeavesForDate returns approved leave requests covering one date.
 */
export function filterLeavesForDate(
	requests: readonly ApprovedLeaveRequest[],
	date: string,
): readonly ApprovedLeaveRequest[] {
	return requests.filter(item => coversDate(item.leaveRequest, date));
}

/**
 * filterLeavesForRange returns approved leave requests overlapping one range.
 */
export function filterLeavesForRange(
	requests: readonly ApprovedLeaveRequest[],
	range: TeamAvailabilityRange,
): readonly ApprovedLeaveRequest[] {
	return requests.filter(item => overlapsRange(item.leaveRequest, range));
}

/**
 * coversDate returns whether one leave request covers a date.
 */
export function coversDate(leaveRequest: LeaveRequest, date: string): boolean {
	return leaveRequest.startDate <= date && leaveRequest.endDate >= date;
}

/**
 * overlapsRange returns whether one leave request overlaps a date range.
 */
export function overlapsRange(leaveRequest: LeaveRequest, range: TeamAvailabilityRange): boolean {
	return leaveRequest.startDate <= range.endDate && leaveRequest.endDate >= range.startDate;
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
 * dateRangeIsValid returns whether the selected date range can be searched.
 */
export function dateRangeIsValid(range: TeamAvailabilityRange): boolean {
	return range.startDate.trim() !== '' && range.endDate.trim() !== '' && range.endDate >= range.startDate;
}

/**
 * rangeInputClassName returns a compact input wrapper style.
 */
export function rangeInputClassName(): string {
	return cn('cf:grid cf:gap-2');
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
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
