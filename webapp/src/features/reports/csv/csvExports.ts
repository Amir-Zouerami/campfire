import {
	exportWorkspaceLeavesCSV,
	exportWorkspaceMissingStandupsCSV,
	exportWorkspaceStandupSubmissionsCSV,
	exportWorkspaceTimeCSV,
} from '@/shared/api';
import type { TranslationKey } from '@/shared/i18n';
import type { StandupSubmissionSortMode } from '@/shared/types/domain';

/**
 * CsvExport describes one downloadable export: what it is, what it needs and how to fetch it.
 */
export type CsvExport = {
	readonly kind: 'time' | 'leaves' | 'standups' | 'missing';
	readonly title: TranslationKey;
	readonly description: TranslationKey;
	readonly filenamePrefix: string;
	/** Standup exports also honour the sort mode. */
	readonly usesSort: boolean;
	readonly fetch: (workspaceID: string, startDate: string, endDate: string, sortMode: StandupSubmissionSortMode) => Promise<Blob>;
};

export const CSV_EXPORTS: readonly CsvExport[] = [
	{
		kind: 'time',
		title: 'reports.csv.action.time.title',
		description: 'reports.csv.action.time.description',
		filenamePrefix: 'campfire-time',
		usesSort: false,
		fetch: (workspaceID, start, end) => exportWorkspaceTimeCSV(workspaceID, start, end),
	},
	{
		kind: 'leaves',
		title: 'reports.csv.action.leaves.title',
		description: 'reports.csv.action.leaves.description',
		filenamePrefix: 'campfire-leaves',
		usesSort: false,
		fetch: (workspaceID, start, end) => exportWorkspaceLeavesCSV(workspaceID, start, end),
	},
	{
		kind: 'standups',
		title: 'reports.csv.action.standups.title',
		description: 'reports.csv.action.standups.description',
		filenamePrefix: 'campfire-standup-submissions',
		usesSort: true,
		fetch: exportWorkspaceStandupSubmissionsCSV,
	},
	{
		kind: 'missing',
		title: 'reports.csv.action.missing.title',
		description: 'reports.csv.action.missing.description',
		filenamePrefix: 'campfire-missing-standups',
		usesSort: true,
		fetch: exportWorkspaceMissingStandupsCSV,
	},
];

/**
 * csvFilename is a stable, descriptive download name.
 */
export function csvFilename(prefix: string, startDate: string, endDate: string): string {
	return `${prefix}-${startDate}-to-${endDate}.csv`;
}
