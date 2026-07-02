import { ApiClientError } from '@/api';
import type { ReportSortMode, StandupSubmissionSortMode } from '@/types/domain';
import { buildWorkspaceDateLabelMap } from '@/lib/calendarLabels';
import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';
import type { TFunction } from '@/i18n';

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
 * getCurrentWeekRange returns the workspace-local week range used by weekly reports.
 */
export function getCurrentWeekRange(timezone = ''): { readonly startDate: string; readonly endDate: string } {
	const today = getTodayForTimezone(timezone);
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
	const weekStartDay = weekStartDayForTimezone(timezone);
	let startOffset = weekStartDay - weekday;
	if (startOffset > 0) {
		startOffset -= 7;
	}

	return {
		startDate: addDaysToLocalDate(today, startOffset),
		endDate: addDaysToLocalDate(today, startOffset + 6),
	};
}

/**
 * getTodayForTimezone returns today's YYYY-MM-DD date in the workspace timezone.
 */
function getTodayForTimezone(timezone: string): string {
	const cleanTimezone = timezone.trim();
	if (cleanTimezone === '') {
		return getTodayLocalDateString();
	}

	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: cleanTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(new Date());

		const year = parts.find(part => part.type === 'year')?.value ?? '';
		const month = parts.find(part => part.type === 'month')?.value ?? '';
		const day = parts.find(part => part.type === 'day')?.value ?? '';

		if (year !== '' && month !== '' && day !== '') {
			return `${year}-${month}-${day}`;
		}
	} catch (_error: unknown) {
		return getTodayLocalDateString();
	}

	return getTodayLocalDateString();
}

/**
 * weekStartDayForTimezone mirrors the backend workspace week order for report defaults.
 */
function weekStartDayForTimezone(timezone: string): number {
	return timezone.trim() === 'Asia/Tehran' ? 6 : 1;
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

/**
 * reportPreviewErrorToMessage localizes known report eligibility failures.
 */
export function reportPreviewErrorToMessage(error: unknown, t: TFunction): string {
	return localizeReportPreviewAPIErrorMessage(errorToMessage(error, t('reports.preview.error.fallback')), t);
}

/**
 * localizeReportPreviewAPIErrorMessage maps backend eligibility copy to the active UI language.
 */
function localizeReportPreviewAPIErrorMessage(message: string, t: TFunction): string {
	if (message.startsWith('No daily standup was active for this workspace on ')) {
		return t('reports.preview.error.noDailyStandup');
	}

	if (message.startsWith('No weekly standup was active for this workspace on ')) {
		return t('reports.preview.error.noWeeklyStandupDate');
	}

	if (message === 'No weekly standup was active in the selected period.') {
		return t('reports.preview.error.noWeeklyStandupPeriod');
	}

	if (message === 'The enabled daily report rule is not connected to an active daily standup schedule for this date.') {
		return t('reports.preview.error.dailyRuleDisconnected');
	}

	if (message === 'The enabled weekly report rule is not connected to an active weekly standup schedule for this period.') {
		return t('reports.preview.error.weeklyRuleDisconnected');
	}

	if (message === 'The enabled report rule is not connected to an active standup schedule.') {
		return t('reports.preview.error.reportRuleDisconnected');
	}

	return message;
}
