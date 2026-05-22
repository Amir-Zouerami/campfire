import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { TimeReportGroupBy, TimeReportRow, TimeReportSummary } from '@/types/domain';

import type { TimeReportFilterDraft, TimeReportSavedFilter } from './time-report.types';

/**
 * timeReportGroupByOptions lists supported workspace time report dimensions.
 */
export const timeReportGroupByOptions: readonly TimeReportGroupBy[] = [
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
 * defaultTimeReportFilter returns the initial time report filter range.
 */
export function defaultTimeReportFilter(): TimeReportFilterDraft {
	const endDate = getTodayLocalDateString();

	return {
		startDate: addDaysToLocalDate(endDate, -14),
		endDate,
		groupBy: 'person',
	};
}

/**
 * validateTimeReportFilter returns a user-facing validation message.
 */
export function validateTimeReportFilter(filter: TimeReportFilterDraft): string | null {
	if (filter.startDate.trim() === '') {
		return 'Start date is required.';
	}

	if (filter.endDate.trim() === '') {
		return 'End date is required.';
	}

	if (filter.endDate < filter.startDate) {
		return 'End date cannot be before start date.';
	}

	return null;
}

/**
 * parseTimeReportSavedFilter parses a saved time report filter JSON string.
 */
export function parseTimeReportSavedFilter(filterJson: string): TimeReportSavedFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			...(typeof parsed.startDate === 'string' ? { startDate: parsed.startDate } : {}),
			...(typeof parsed.endDate === 'string' ? { endDate: parsed.endDate } : {}),
			...(typeof parsed.groupBy === 'string' && isTimeReportGroupBy(parsed.groupBy)
				? { groupBy: parsed.groupBy }
				: {}),
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * isTimeReportGroupBy returns whether a string is a supported report dimension.
 */
export function isTimeReportGroupBy(value: string): value is TimeReportGroupBy {
	return timeReportGroupByOptions.includes(value as TimeReportGroupBy);
}

/**
 * toTimeReportGroupBy narrows a select value to a supported report dimension.
 */
export function toTimeReportGroupBy(value: string): TimeReportGroupBy {
	return isTimeReportGroupBy(value) ? value : 'person';
}

/**
 * collectTimeReportUserIDs returns user IDs needed for profile labels.
 */
export function collectTimeReportUserIDs(summary: TimeReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return uniqueStrings(summary.rows.map(row => row.userId));
}

/**
 * timeReportEntryCount returns the total number of time entries in a summary.
 */
export function timeReportEntryCount(summary: TimeReportSummary | null): number {
	if (summary === null) {
		return 0;
	}

	return summary.rows.reduce((total, row) => total + row.entryCount, 0);
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
 * formatTimeReportGroupBy returns a readable group-by label.
 */
export function formatTimeReportGroupBy(groupBy: TimeReportGroupBy): string {
	return formatLabel(groupBy);
}

/**
 * timeReportRowTitle returns the best display label for a row.
 */
export function timeReportRowTitle(
	row: TimeReportRow,
	groupBy: TimeReportGroupBy,
	labelForUserID: (userID: string) => string,
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

	return 'Unlabeled';
}

/**
 * timeReportRowSubtitle returns compact row metadata.
 */
export function timeReportRowSubtitle(row: TimeReportRow): string {
	const pieces = [
		row.periodStart === row.periodEnd ? row.periodStart : `${row.periodStart} → ${row.periodEnd}`,
		row.entryCount === 1 ? '1 entry' : `${row.entryCount} entries`,
	].filter(Boolean);

	return pieces.join(' · ');
}

/**
 * timeReportRowMetaChips returns visible row metadata chips.
 */
export function timeReportRowMetaChips(
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
 * selectClassName returns the shared native select style.
 */
export function selectClassName(): string {
	return cn(
		'cf:h-11 cf:w-full cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/25 cf:px-3 cf:py-2 cf:text-base cf:font-semibold cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-amber-300/45 cf:focus-visible:ring-2 cf:focus-visible:ring-amber-300/20',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-60',
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

	return 'Could not load the time report.';
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

/**
 * isRecord returns whether an unknown value is a string-keyed object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
