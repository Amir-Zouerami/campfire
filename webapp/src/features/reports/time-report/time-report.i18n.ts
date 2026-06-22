import type { TFunction } from '@/i18n';
import type { TimeReportGroupBy, TimeReportRow } from '@/types/domain';

/**
 * timeReportGroupByLabel returns the localized label for a report grouping dimension.
 */
export function timeReportGroupByLabel(groupBy: TimeReportGroupBy, t: TFunction): string {
	switch (groupBy) {
		case 'person':
			return t('reports.time.group.person');

		case 'project':
			return t('reports.time.group.project');

		case 'category':
			return t('reports.time.group.category');

		case 'task':
			return t('reports.time.group.task');

		case 'day':
			return t('reports.time.group.day');

		case 'week':
			return t('reports.time.group.week');
	}
}

/**
 * timeReportRowSubtitle returns localized compact row metadata.
 */
export function timeReportRowSubtitle(row: TimeReportRow, t: TFunction): string {
	const periodLabel = row.periodStart === row.periodEnd
		? row.periodStart
		: t('reports.time.row.periodRange', { start: row.periodStart, end: row.periodEnd });

	const entryLabel = row.entryCount === 1
		? t('reports.time.row.entrySingular')
		: t('reports.time.row.entryPlural', { count: row.entryCount });

	return [periodLabel, entryLabel].filter(Boolean).join(' · ');
}

/**
 * timeReportRowMetaChips returns localized visible row metadata chips.
 */
export function timeReportRowMetaChips(
	row: TimeReportRow,
	t: TFunction,
): readonly { readonly label: string; readonly value: string }[] {
	return [
		{ label: t('reports.time.meta.user'), value: row.userId },
		{ label: t('reports.time.meta.task'), value: row.taskId },
		{ label: t('reports.time.meta.project'), value: row.projectId },
		{ label: t('reports.time.meta.category'), value: row.categoryId },
	].filter(item => item.value.trim() !== '');
}
