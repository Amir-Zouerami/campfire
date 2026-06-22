import type { TFunction } from '@/i18n';
import type { ReportKind } from '@/types/domain';

/**
 * savedFilterReportKindLabel returns the localized label for a saved-filter report kind.
 */
export function savedFilterReportKindLabel(reportKind: ReportKind, t: TFunction): string {
	switch (reportKind) {
		case 'daily':
			return t('reports.saved.reportKind.daily');

		case 'weekly':
			return t('reports.saved.reportKind.weekly');

		case 'blockers':
			return t('reports.saved.reportKind.blockers');

		case 'missing':
			return t('reports.saved.reportKind.missing');

		case 'time':
			return t('reports.saved.reportKind.time');
	}
}
