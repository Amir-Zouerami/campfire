import { ApiClientError } from '@/api';
import type { TFunction, TranslationKey } from '@/i18n';
import type { DataRetentionSummary } from '@/types/api';

import type { DataRetentionMetric } from './data-management.types';

/**
 * dataRetentionMetricKeys defines operational row groups shown before purge.
 */
export const dataRetentionMetricKeys: readonly DataRetentionMetric['key'][] = [
	'standupSubmissions',
	'standupAnswers',
	'leaveRequests',
	'leaveDecisions',
	'timeEntries',
	'reportRuns',
	'notificationRuns',
	'auditLogEntries',
];

/**
 * localizedDataRetentionMetrics returns localized labels for retention summary rows.
 */
export function localizedDataRetentionMetrics(t: TFunction): readonly DataRetentionMetric[] {
	return dataRetentionMetricKeys.map(key => ({
		key,
		label: t(dataRetentionMetricLabelKey(key)),
		description: t(dataRetentionMetricDescriptionKey(key)),
	}));
}

/**
 * defaultRetentionCutoffDate returns a conservative default date.
 */
export function defaultRetentionCutoffDate(): string {
	const date = new Date();
	date.setDate(date.getDate() - 90);

	return formatLocalDate(date);
}

/**
 * formatRetentionCount formats an integer count for cards and warnings.
 */
export function formatRetentionCount(value: number, locale: string): string {
	return new Intl.NumberFormat(locale).format(value);
}

/**
 * hasPurgeableRows reports whether a preview has any rows to delete.
 */
export function hasPurgeableRows(summary: DataRetentionSummary | undefined): boolean {
	return summary !== undefined && summary.totalRows > 0;
}

/**
 * errorToMessage maps unknown errors to user-facing text.
 */
export function errorToMessage(error: unknown, t: TFunction): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error && error.message.trim() !== '') {
		return error.message;
	}

	return t('settings.dataManagement.error.action');
}

/**
 * dataRetentionMetricLabelKey returns the translation key for one retention metric label.
 */
function dataRetentionMetricLabelKey(key: DataRetentionMetric['key']): TranslationKey {
	switch (key) {
		case 'standupSubmissions':
			return 'settings.dataManagement.metric.standupSubmissions.label';
		case 'standupAnswers':
			return 'settings.dataManagement.metric.standupAnswers.label';
		case 'leaveRequests':
			return 'settings.dataManagement.metric.leaveRequests.label';
		case 'leaveDecisions':
			return 'settings.dataManagement.metric.leaveDecisions.label';
		case 'timeEntries':
			return 'settings.dataManagement.metric.timeEntries.label';
		case 'reportRuns':
			return 'settings.dataManagement.metric.reportRuns.label';
		case 'notificationRuns':
			return 'settings.dataManagement.metric.notificationRuns.label';
		case 'auditLogEntries':
			return 'settings.dataManagement.metric.auditLogEntries.label';
	}
}

/**
 * dataRetentionMetricDescriptionKey returns the translation key for one retention metric description.
 */
function dataRetentionMetricDescriptionKey(key: DataRetentionMetric['key']): TranslationKey {
	switch (key) {
		case 'standupSubmissions':
			return 'settings.dataManagement.metric.standupSubmissions.description';
		case 'standupAnswers':
			return 'settings.dataManagement.metric.standupAnswers.description';
		case 'leaveRequests':
			return 'settings.dataManagement.metric.leaveRequests.description';
		case 'leaveDecisions':
			return 'settings.dataManagement.metric.leaveDecisions.description';
		case 'timeEntries':
			return 'settings.dataManagement.metric.timeEntries.description';
		case 'reportRuns':
			return 'settings.dataManagement.metric.reportRuns.description';
		case 'notificationRuns':
			return 'settings.dataManagement.metric.notificationRuns.description';
		case 'auditLogEntries':
			return 'settings.dataManagement.metric.auditLogEntries.description';
	}
}

/**
 * formatLocalDate formats one browser-local Date as YYYY-MM-DD.
 */
function formatLocalDate(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}
