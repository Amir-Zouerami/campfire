import { ApiClientError } from '@/api';
import type { ReportSortMode, StandupSubmissionSortMode } from '@/types/domain';
import { buildWorkspaceDateLabelMap } from '@/lib/calendarLabels';
import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';

/**
 * dailyReportSortOptions lists supported daily report sort modes.
 */
export const dailyReportSortOptions: readonly StandupSubmissionSortMode[] = [
	'name',
	'first_submitted',
	'last_submitted',
	'missing_first',
];

/**
 * weeklyReportSortOptions lists supported weekly report sort modes.
 */
export const weeklyReportSortOptions: readonly ReportSortMode[] = [
	'name',
	'first_submitted',
	'last_submitted',
	'missing_first',
	'blockers_first',
];

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
export function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

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

	const nextYear = String(date.getFullYear());
	const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
	const nextDay = String(date.getDate()).padStart(2, '0');

	return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * getCurrentWeekRange returns a Monday-to-Sunday local date range.
 */
export function getCurrentWeekRange(): { readonly startDate: string; readonly endDate: string } {
	const today = getTodayLocalDateString();
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
 * reportDateRangeIsValid returns whether a report date range can be loaded.
 */
export function reportDateRangeIsValid(startDate: string, endDate: string): boolean {
	const normalizedStartDate = normalizeISODateInputValue(startDate);
	const normalizedEndDate = normalizeISODateInputValue(endDate);

	return (
		isISODateInputValue(normalizedStartDate) &&
		isISODateInputValue(normalizedEndDate) &&
		normalizedEndDate >= normalizedStartDate
	);
}

/**
 * toDailyReportSortMode narrows a select value to a daily sort mode.
 */
export function toDailyReportSortMode(value: string): StandupSubmissionSortMode {
	if (value === 'name' || value === 'last_submitted' || value === 'missing_first') {
		return value;
	}

	return 'first_submitted';
}

/**
 * toWeeklyReportSortMode narrows a select value to a weekly sort mode.
 */
export function toWeeklyReportSortMode(value: string): ReportSortMode {
	if (value === 'name' || value === 'last_submitted' || value === 'missing_first' || value === 'blockers_first') {
		return value;
	}

	return 'first_submitted';
}

/**
 * buildDailyReportCalendarLabels returns browser-generated date labels for one report day.
 */
export function buildDailyReportCalendarLabels(
	date: string,
	timezone: string,
): Readonly<Record<string, string>> {
	return buildWorkspaceDateLabelMap([date], timezone);
}

/**
 * buildWeeklyReportCalendarLabels returns browser-generated labels for an inclusive weekly range.
 */
export function buildWeeklyReportCalendarLabels(
	startDate: string,
	endDate: string,
	timezone: string,
): Readonly<Record<string, string>> {
	if (!reportDateRangeIsValid(startDate, endDate)) {
		return {};
	}

	const dates: string[] = [];
	let currentDate = normalizeISODateInputValue(startDate);
	const normalizedEndDate = normalizeISODateInputValue(endDate);

	while (currentDate <= normalizedEndDate && dates.length < 14) {
		dates.push(currentDate);
		currentDate = addDaysToLocalDate(currentDate, 1);
	}

	return buildWorkspaceDateLabelMap(dates, timezone);
}

/**
 * markdownLineCount returns a compact Markdown size metric.
 */
export function markdownLineCount(markdown: string): number {
	if (markdown.trim() === '') {
		return 0;
	}

	return markdown.split('\n').length;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
}
