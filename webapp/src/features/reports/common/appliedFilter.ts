import { isRecord } from '@/shared/lib/guards';
import { normalizeDateInput } from '@/shared/lib/date';
import type { ReportSortMode, SavedReportFilter, StandupSubmissionSortMode, TimeReportGroupBy } from '@/shared/types/domain';

/**
 * Saved filters store a report screen's settings as JSON. Each report reads only the fields it
 * understands and ignores the rest, so one saved shape can serve related reports.
 */
export type FilterRecord = Readonly<Record<string, unknown>>;

/**
 * parseFilter returns the JSON object of a saved filter, or null when it is not a JSON object.
 */
export function parseFilter(filter: SavedReportFilter): FilterRecord | null {
	try {
		const parsed: unknown = JSON.parse(filter.filterJson);

		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * filterDate reads a date field, accepting the same typed spellings as a date input.
 */
export function filterDate(record: FilterRecord, key: string): string | undefined {
	const value = record[key];

	return typeof value === 'string' ? (normalizeDateInput(value) ?? undefined) : undefined;
}

const DAILY_SORTS = ['name', 'first_submitted', 'last_submitted', 'missing_first'] as const;
const WEEKLY_SORTS = ['name', 'first_submitted', 'last_submitted', 'missing_first', 'blockers_first'] as const;
const GROUPINGS = ['person', 'project', 'category', 'task', 'day', 'week'] as const;

/**
 * filterDailySort reads a daily sort mode, defaulting to first submitted.
 */
export function filterDailySort(record: FilterRecord): StandupSubmissionSortMode {
	const value = record.sortMode;

	return DAILY_SORTS.find(candidate => candidate === value) ?? 'first_submitted';
}

/**
 * filterWeeklySort reads a weekly sort mode, defaulting to first submitted.
 */
export function filterWeeklySort(record: FilterRecord): ReportSortMode {
	const value = record.sortMode;

	return WEEKLY_SORTS.find(candidate => candidate === value) ?? 'first_submitted';
}

/**
 * filterGrouping reads a time-report grouping, defaulting to person.
 */
export function filterGrouping(record: FilterRecord): TimeReportGroupBy {
	const value = record.groupBy;

	return GROUPINGS.find(candidate => candidate === value) ?? 'person';
}
