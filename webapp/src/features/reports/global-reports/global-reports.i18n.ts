import type { TFunction } from '@/i18n';
import type { TimeReportGroupBy, TimeReportRow } from '@/types/domain';

/**
 * globalReportGroupByLabel returns the localized label for a global time grouping dimension.
 */
export function globalReportGroupByLabel(groupBy: TimeReportGroupBy, t: TFunction): string {
	switch (groupBy) {
		case 'person':
			return t('reports.global.group.person');

		case 'project':
			return t('reports.global.group.project');

		case 'category':
			return t('reports.global.group.category');

		case 'task':
			return t('reports.global.group.task');

		case 'day':
			return t('reports.global.group.day');

		case 'week':
			return t('reports.global.group.week');
	}
}

/**
 * globalTimeRowSubtitle returns localized compact metadata for one grouped time row.
 */
export function globalTimeRowSubtitle(row: TimeReportRow, t: TFunction): string {
	const periodLabel = row.periodStart === row.periodEnd
		? row.periodStart
		: t('reports.global.time.row.periodRange', { start: row.periodStart, end: row.periodEnd });

	const entryLabel = row.entryCount === 1
		? t('reports.global.entry.singular')
		: t('reports.global.entry.plural', { count: row.entryCount });

	return [periodLabel, entryLabel].filter(Boolean).join(' · ');
}

/**
 * globalTimeRowMetaChips returns localized visible row metadata chips.
 */
export function globalTimeRowMetaChips(
	row: TimeReportRow,
	t: TFunction,
): readonly { readonly label: string; readonly value: string }[] {
	return [
		{ label: t('reports.global.meta.user'), value: row.userId },
		{ label: t('reports.global.meta.task'), value: row.taskId },
		{ label: t('reports.global.meta.project'), value: row.projectId },
		{ label: t('reports.global.meta.category'), value: row.categoryId },
	].filter(item => item.value.trim() !== '');
}

/**
 * globalLeaveDurationLabel localizes leave duration values for global reports.
 */
export function globalLeaveDurationLabel(
	durationMode: string,
	halfDayPart: string,
	startTime: string,
	endTime: string,
	t: TFunction,
): string {
	if (durationMode === 'half_day') {
		return halfDayPart.trim() === ''
			? t('reports.global.leave.duration.halfDay')
			: t('reports.global.leave.duration.halfDayPart', {
				part: globalLeaveHalfDayPartLabel(halfDayPart, t),
			});
	}

	if (durationMode === 'hourly') {
		return t('reports.global.leave.duration.hourly', { start: startTime, end: endTime });
	}

	return t('reports.global.leave.duration.fullDay');
}

/**
 * globalLeaveStatusLabel localizes leave status values for global reports.
 */
export function globalLeaveStatusLabel(status: string, t: TFunction): string {
	switch (status) {
		case 'approved':
			return t('reports.global.leave.status.approved');

		case 'pending':
			return t('reports.global.leave.status.pending');

		case 'rejected':
			return t('reports.global.leave.status.rejected');

		case 'cancelled':
			return t('reports.global.leave.status.cancelled');

		default:
			return t('common.unknown');
	}
}

/**
 * globalLeaveHalfDayPartLabel localizes half-day part values for global reports.
 */
function globalLeaveHalfDayPartLabel(part: string, t: TFunction): string {
	switch (part) {
		case 'morning':
			return t('reports.global.leave.halfDay.morning');

		case 'afternoon':
			return t('reports.global.leave.halfDay.afternoon');

		default:
			return part;
	}
}
