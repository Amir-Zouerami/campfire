import type { StandupSubmissionSortMode } from '@/types/domain';

/**
 * CSVExportLoadState describes the CSV export center state.
 */
export type CSVExportLoadState = 'idle' | 'exporting' | 'done' | 'error';

/**
 * CSVExportKind identifies one export action.
 */
export type CSVExportKind = 'time' | 'leaves' | 'standups' | 'missing';

/**
 * CSVExportFilterDraft stores shared export filters.
 */
export type CSVExportFilterDraft = {
	readonly startDate: string;
	readonly endDate: string;
	readonly sortMode: StandupSubmissionSortMode;
};

/**
 * CSVExportFilterPatch updates part of the export filters.
 */
export type CSVExportFilterPatch = Partial<CSVExportFilterDraft>;

/**
 * CSVExportSavedFilter stores parsed saved-filter data for CSV exports.
 */
export type CSVExportSavedFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly sortMode?: StandupSubmissionSortMode;
};

/**
 * CSVExportActionDefinition describes one downloadable export.
 */
export type CSVExportActionDefinition = {
	readonly kind: CSVExportKind;
	readonly title: string;
	readonly description: string;
	readonly filenamePrefix: string;
	readonly includesSortMode: boolean;
};
