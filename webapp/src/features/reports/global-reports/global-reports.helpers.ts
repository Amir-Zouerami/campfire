import { ApiClientError } from '@/api';
import type { TFunction } from '@/i18n';
import { cn } from '@/lib/utils';
import type {
	GlobalLeaveReportSummary,
	GlobalTimeReportSummary,
	TimeReportGroupBy,
	TimeReportRow,
} from '@/types/domain';

import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';
import type { GlobalDateRange, GlobalTimeReportFilter } from './global-reports.types';

/**
 * globalTimeGroupByOptions lists global time grouping dimensions.
 */
export const globalTimeGroupByOptions: readonly TimeReportGroupBy[] = [
	'person',
	'project',
	'category',
	'task',
	'day',
	'week',
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
 * defaultGlobalDateRange returns the initial global report date range.
 */
export function defaultGlobalDateRange(): GlobalDateRange {
	const endDate = getTodayLocalDateString();

	return {
		startDate: addDaysToLocalDate(endDate, -30),
		endDate,
	};
}

/**
 * defaultGlobalTimeFilter returns the initial global time report filter.
 */
export function defaultGlobalTimeFilter(): GlobalTimeReportFilter {
	return {
		...defaultGlobalDateRange(),
		groupBy: 'person',
	};
}

/**
 * validateGlobalDateRange returns a user-facing validation message.
 */
export function validateGlobalDateRange(range: GlobalDateRange, t: TFunction): string | null {
	const normalizedRange = normalizeGlobalDateRange(range);

	if (normalizedRange.startDate.trim() === '') {
		return t('reports.global.validation.startRequired');
	}

	if (normalizedRange.endDate.trim() === '') {
		return t('reports.global.validation.endRequired');
	}

	if (!isISODateInputValue(normalizedRange.startDate)) {
		return t('reports.global.validation.startInvalid');
	}

	if (!isISODateInputValue(normalizedRange.endDate)) {
		return t('reports.global.validation.endInvalid');
	}

	if (normalizedRange.endDate < normalizedRange.startDate) {
		return t('reports.global.validation.rangeOrder');
	}

	return null;
}

/**
 * normalizeGlobalDateRange normalizes date text before report API calls.
 */
export function normalizeGlobalDateRange(range: GlobalDateRange): GlobalDateRange {
	return {
		startDate: normalizeISODateInputValue(range.startDate),
		endDate: normalizeISODateInputValue(range.endDate),
	};
}

/**
 * isTimeReportGroupBy returns whether a string is a supported time grouping.
 */
export function isTimeReportGroupBy(value: string): value is TimeReportGroupBy {
	return globalTimeGroupByOptions.includes(value as TimeReportGroupBy);
}

/**
 * toTimeReportGroupBy narrows a select value to a global time grouping.
 */
export function toTimeReportGroupBy(value: string): TimeReportGroupBy {
	return isTimeReportGroupBy(value) ? value : 'person';
}

/**
 * formatGroupBy returns a readable group-by label.
 */
export function formatGroupBy(value: TimeReportGroupBy): string {
	return formatLabel(value);
}

/**
 * formatMinutes formats minutes as a compact duration.
 */
export function formatMinutes(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;

	if (remainder === 0) {
		return `${hours}h`;
	}

	return `${hours}h ${remainder}m`;
}

/**
 * collectGlobalTimeUserIDs returns user IDs needed for global time labels.
 */
export function collectGlobalTimeUserIDs(summary: GlobalTimeReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return uniqueStrings(summary.rows.map(row => row.userId));
}

/**
 * collectGlobalLeaveUserIDs returns user IDs needed for global leave labels.
 */
export function collectGlobalLeaveUserIDs(summary: GlobalLeaveReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return uniqueStrings(
		summary.rows.flatMap(row => [row.leaveRequest.leaveRequest.userId, row.leaveRequest.leaveRequest.backupUserId]),
	);
}

/**
 * globalTimeRowTitle returns the best display label for a global time row.
 */
export function globalTimeRowTitle(
	row: TimeReportRow,
	groupBy: TimeReportGroupBy,
	labelForUserID: (userID: string) => string,
	fallback: string,
): string {
	if (groupBy === 'person' && row.userId.trim() !== '') {
		return labelForUserID(row.userId);
	}

	if (row.label.trim() !== '') {
		return row.label;
	}

	if (row.key.trim() !== '') {
		return row.key;
	}

	return fallback;
}

/**
 * globalTimeRowSubtitle returns compact global time row metadata.
 */
export function globalTimeRowSubtitle(row: TimeReportRow): string {
	const period = row.periodStart === row.periodEnd ? row.periodStart : `${row.periodStart} → ${row.periodEnd}`;
	const entryLabel = row.entryCount === 1 ? '1 entry' : `${row.entryCount} entries`;

	return `${period} · ${entryLabel}`;
}

/**
 * globalTimeRowMetaChips returns visible row metadata chips.
 */
export function globalTimeRowMetaChips(
	row: TimeReportRow,
): readonly { readonly label: string; readonly value: string }[] {
	return [
		{ label: 'User', value: row.userId },
		{ label: 'Task', value: row.taskId },
		{ label: 'Project', value: row.projectId },
		{ label: 'Category', value: row.categoryId },
	].filter(item => item.value.trim() !== '');
}

/**
 * formatLeaveRange returns a compact leave range.
 */
export function formatLeaveRange(startDate: string, endDate: string): string {
	if (startDate === endDate) {
		return startDate;
	}

	return `${startDate} → ${endDate}`;
}

/**
 * formatLeaveDuration returns compact leave duration details.
 */
export function formatLeaveDuration(
	durationMode: string,
	halfDayPart: string,
	startTime: string,
	endTime: string,
): string {
	if (durationMode === 'half_day') {
		return halfDayPart.trim() === '' ? 'Half day' : `Half day · ${formatLabel(halfDayPart)}`;
	}

	if (durationMode === 'hourly') {
		return `${startTime} → ${endTime}`;
	}

	return 'Full day';
}

/**
 * formatLeaveStatus returns a readable leave status.
 */
export function formatLeaveStatus(status: string): string {
	return formatLabel(status);
}

/**
 * leaveStatusTone returns a status tone for a leave row.
 */
export function leaveStatusTone(status: string): 'green' | 'ember' | 'red' | 'slate' {
	switch (status) {
		case 'approved':
			return 'green';

		case 'pending':
			return 'ember';

		case 'rejected':
			return 'red';

		default:
			return 'slate';
	}
}

/**
 * buildGlobalExportFilename returns a stable global CSV filename.
 */
export function buildGlobalExportFilename(prefix: string, range: GlobalDateRange): string {
	return `${prefix}-${range.startDate}-to-${range.endDate}.csv`;
}

/**
 * downloadGlobalCSVBlob downloads a CSV Blob in the browser.
 */
export function downloadGlobalCSVBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}

/**
 * globalReportTabClassName returns the global report tab button style.
 */
export function globalReportTabClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-h-[78px] cf:w-full cf:min-w-0 cf:flex-col cf:items-start cf:justify-center cf:gap-1 cf:rounded-2xl cf:border cf:px-5 cf:py-4 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.04] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.06]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.10] cf:shadow-lg',
	);
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
