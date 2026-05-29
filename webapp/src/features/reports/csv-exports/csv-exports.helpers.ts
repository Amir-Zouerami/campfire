import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { StandupSubmissionSortMode } from '@/types/domain';

import type { CSVExportActionDefinition, CSVExportFilterDraft, CSVExportSavedFilter } from './csv-exports.types';

/**
 * csvExportSortOptions lists supported standup CSV sort modes.
 */
export const csvExportSortOptions: readonly StandupSubmissionSortMode[] = [
	'first_submitted',
	'last_submitted',
	'name',
	'missing_first',
];

/**
 * csvExportActions defines the available workspace CSV exports.
 */
export const csvExportActions: readonly CSVExportActionDefinition[] = [
	{
		kind: 'time',
		title: 'Time entries',
		description: 'Download raw workspace time entries for the selected date range.',
		filenamePrefix: 'campfire-time',
		includesSortMode: false,
	},
	{
		kind: 'leaves',
		title: 'Approved leave',
		description: 'Download approved leave requests overlapping the selected date range.',
		filenamePrefix: 'campfire-leaves',
		includesSortMode: false,
	},
	{
		kind: 'standups',
		title: 'Standup submissions',
		description: 'Download submitted standups and answer rows for the selected date range.',
		filenamePrefix: 'campfire-standup-submissions',
		includesSortMode: true,
	},
	{
		kind: 'missing',
		title: 'Missing standups',
		description: 'Download missing-user rows for each standup occurrence in the selected range.',
		filenamePrefix: 'campfire-missing-standups',
		includesSortMode: true,
	},
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
 * defaultCSVExportFilter returns the initial export date range.
 */
export function defaultCSVExportFilter(): CSVExportFilterDraft {
	const endDate = getTodayLocalDateString();

	return {
		startDate: addDaysToLocalDate(endDate, -14),
		endDate,
		sortMode: 'first_submitted',
	};
}

/**
 * validateCSVExportFilter returns a user-facing validation message.
 */
export function validateCSVExportFilter(filter: CSVExportFilterDraft): string | null {
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
 * parseCSVExportSavedFilter parses a saved CSV export filter JSON string.
 */
export function parseCSVExportSavedFilter(filterJson: string): CSVExportSavedFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			...(typeof parsed.startDate === 'string' ? { startDate: parsed.startDate } : {}),
			...(typeof parsed.endDate === 'string' ? { endDate: parsed.endDate } : {}),
			...(typeof parsed.sortMode === 'string' && isCSVExportSortMode(parsed.sortMode)
				? { sortMode: parsed.sortMode }
				: {}),
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * isCSVExportSortMode returns whether a string is a supported standup CSV sort mode.
 */
export function isCSVExportSortMode(value: string): value is StandupSubmissionSortMode {
	return csvExportSortOptions.includes(value as StandupSubmissionSortMode);
}

/**
 * toCSVExportSortMode narrows a select value to a supported sort mode.
 */
export function toCSVExportSortMode(value: string): StandupSubmissionSortMode {
	return isCSVExportSortMode(value) ? value : 'first_submitted';
}

/**
 * formatCSVExportSortMode returns a readable sort label.
 */
export function formatCSVExportSortMode(sortMode: StandupSubmissionSortMode): string {
	return sortMode
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * buildCSVExportFilename returns a stable browser download filename.
 */
export function buildCSVExportFilename(prefix: string, filter: CSVExportFilterDraft): string {
	return `${prefix}-${filter.startDate}-to-${filter.endDate}.csv`;
}

/**
 * downloadCSVBlob downloads a Blob in the browser.
 */
export function downloadCSVBlob(blob: Blob, filename: string): void {
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
 * exportActionCardClassName returns a style for one export action card.
 */
export function exportActionCardClassName(active: boolean): string {
	return cn(
		'campfire-flat-list-row campfire-flat-list-row--export' ,
		active
			? 'campfire-flat-list-row--active'
			: '',
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

	return 'Could not export CSV.';
}

/**
 * isRecord returns whether an unknown value is a string-keyed object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}