import type { TranslationKey } from '@/i18n';
import type { ReportSortMode, StandupSubmissionSortMode } from '@/types/domain';

/**
 * reportSortModeTranslationKeys maps stable sort values to UI translation keys.
 */
const reportSortModeTranslationKeys: Readonly<Record<ReportSortMode, TranslationKey>> = {
	name: 'reports.preview.sort.name',
	first_submitted: 'reports.preview.sort.firstSubmitted',
	last_submitted: 'reports.preview.sort.lastSubmitted',
	missing_first: 'reports.preview.sort.missingFirst',
	blockers_first: 'reports.preview.sort.blockersFirst',
};

/**
 * translateReportSortMode returns the localized label for a report sort mode.
 */
export function translateReportSortMode(
	t: (key: TranslationKey) => string,
	sortMode: ReportSortMode | StandupSubmissionSortMode,
): string {
	return t(reportSortModeTranslationKeys[sortMode]);
}
