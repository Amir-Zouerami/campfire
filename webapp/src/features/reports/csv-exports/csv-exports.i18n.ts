import type { TFunction } from '@/i18n';
import type { StandupSubmissionSortMode } from '@/types/domain';

import type { CSVExportKind } from './csv-exports.types';

/**
 * csvExportActionTitle returns the localized title for one export action.
 */
export function csvExportActionTitle(kind: CSVExportKind, t: TFunction): string {
	switch (kind) {
		case 'time':
			return t('reports.csv.action.time.title');

		case 'leaves':
			return t('reports.csv.action.leaves.title');

		case 'standups':
			return t('reports.csv.action.standups.title');

		case 'missing':
			return t('reports.csv.action.missing.title');
	}
}

/**
 * csvExportActionDescription returns the localized description for one export action.
 */
export function csvExportActionDescription(kind: CSVExportKind, t: TFunction): string {
	switch (kind) {
		case 'time':
			return t('reports.csv.action.time.description');

		case 'leaves':
			return t('reports.csv.action.leaves.description');

		case 'standups':
			return t('reports.csv.action.standups.description');

		case 'missing':
			return t('reports.csv.action.missing.description');
	}
}

/**
 * csvExportSortModeLabel returns localized labels for standup CSV sort modes.
 */
export function csvExportSortModeLabel(sortMode: StandupSubmissionSortMode, t: TFunction): string {
	switch (sortMode) {
		case 'name':
			return t('reports.preview.sort.name');

		case 'first_submitted':
			return t('reports.preview.sort.firstSubmitted');

		case 'last_submitted':
			return t('reports.preview.sort.lastSubmitted');

		case 'missing_first':
			return t('reports.preview.sort.missingFirst');
	}
}
