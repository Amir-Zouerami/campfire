import { ApiClientError } from '@/api';
import type { ReportKind, SavedReportFilter } from '@/types/domain';

/**
 * savedFilterReportKinds lists report types that support saved filters.
 */
export const savedFilterReportKinds: readonly ReportKind[] = ['daily', 'weekly', 'blockers', 'missing', 'time'];

/**
 * defaultDailyFilterJson is a useful starter filter for daily reports.
 */
const defaultDailyFilterJson = `{
  "occurrenceDate": "",
  "sortMode": "first_submitted"
}`;

/**
 * defaultWeeklyFilterJson is a useful starter filter for weekly reports.
 */
const defaultWeeklyFilterJson = `{
  "periodStart": "",
  "periodEnd": "",
  "sortMode": "blockers_first"
}`;

/**
 * defaultTimeFilterJson is a useful starter filter for time reports.
 */
const defaultTimeFilterJson = `{
  "startDate": "",
  "endDate": "",
  "groupBy": "person"
}`;

/**
 * defaultMissingFilterJson is a useful starter filter for missing/CSV reports.
 */
const defaultMissingFilterJson = `{
  "startDate": "",
  "endDate": "",
  "sortMode": "missing_first"
}`;

/**
 * defaultBlockersFilterJson is a useful starter filter for blocker-focused reports.
 */
const defaultBlockersFilterJson = `{
  "startDate": "",
  "endDate": "",
  "sortMode": "blockers_first",
  "includeBlockers": true
}`;

/**
 * defaultFilterJsonForReportKind returns starter JSON for one report type.
 */
export function defaultFilterJsonForReportKind(reportKind: ReportKind): string {
	switch (reportKind) {
		case 'daily':
			return defaultDailyFilterJson;

		case 'weekly':
			return defaultWeeklyFilterJson;

		case 'time':
			return defaultTimeFilterJson;

		case 'missing':
			return defaultMissingFilterJson;

		case 'blockers':
			return defaultBlockersFilterJson;
	}
}

/**
 * normalizeFilterJson validates and pretty-prints filter JSON.
 */
export function normalizeFilterJson(filterJson: string): string | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		return JSON.stringify(parsed, null, 2);
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * sortSavedFilters returns filters with the newest updated filters first.
 */
export function sortSavedFilters(filters: readonly SavedReportFilter[]): readonly SavedReportFilter[] {
	return [...filters].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

/**
 * formatReportKind returns a readable report type label.
 */
export function formatReportKind(reportKind: ReportKind): string {
	return reportKind
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * toReportKind narrows a string to a supported report kind.
 */
export function toReportKind(value: string): ReportKind {
	if (value === 'weekly' || value === 'blockers' || value === 'missing' || value === 'time') {
		return value;
	}

	return 'daily';
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
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

	return 'Could not update saved report filters.';
}
