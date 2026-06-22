import type { TFunction } from '@/i18n/types';
import type { ReportKind, ReportLanguage, ReportSortMode } from '@/types/domain';

import type { StandupScheduleLabel } from '../standup-schedule-labels';

/**
 * localizedReportRuleTitle returns a translated card title while preserving user-authored template names.
 */
export function localizedReportRuleTitle(t: TFunction, label: StandupScheduleLabel, reportKind: ReportKind): string {
	const reportKindLabel = localizedReportKind(t, reportKind);

	if (label.unavailable) {
		return t('settings.reportRules.rule.unlinked.title', { reportKind: reportKindLabel });
	}

	return t('settings.reportRules.rule.title', {
		templateName: label.templateName,
		reportKind: reportKindLabel,
	});
}

/**
 * localizedReportRuleDescription returns one report-rule card description.
 */
export function localizedReportRuleDescription(t: TFunction, label: StandupScheduleLabel, reportKind: ReportKind): string {
	if (label.unavailable) {
		return t('settings.reportRules.rule.unlinked.description');
	}

	return t('settings.reportRules.rule.description', {
		reportKind: localizedReportKind(t, reportKind),
		openTime: label.opensAt,
		closeTime: label.timeOfDay,
	});
}

/**
 * localizedReportKind returns a translated report kind label.
 */
export function localizedReportKind(t: TFunction, reportKind: ReportKind): string {
	switch (reportKind) {
		case 'daily':
			return t('settings.reportRules.kind.daily');
		case 'weekly':
			return t('settings.reportRules.kind.weekly');
		case 'blockers':
			return t('settings.reportRules.kind.blockers');
		case 'missing':
			return t('settings.reportRules.kind.missing');
		case 'time':
			return t('settings.reportRules.kind.time');
	}
}

/**
 * localizedReportSortMode returns a translated report sort label.
 */
export function localizedReportSortMode(t: TFunction, sortMode: ReportSortMode): string {
	switch (sortMode) {
		case 'name':
			return t('reports.sort.name');
		case 'first_submitted':
			return t('reports.sort.firstSubmitted');
		case 'last_submitted':
			return t('reports.sort.lastSubmitted');
		case 'missing_first':
			return t('reports.sort.missingFirst');
		case 'blockers_first':
			return t('reports.sort.blockersFirst');
	}
}

/**
 * localizedReportLanguage returns a translated language label.
 */
export function localizedReportLanguage(t: TFunction, language: ReportLanguage): string {
	switch (language) {
		case 'persian':
			return t('common.persian');
		case 'arabic':
			return t('common.arabic');
		case 'english':
			return t('common.english');
	}
}
