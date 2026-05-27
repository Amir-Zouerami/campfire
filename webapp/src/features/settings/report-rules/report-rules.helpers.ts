import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { ReportKind, ReportRule, ReportSortMode } from '@/types/domain';

import type { ReportRuleDraft, ReportRuleDraftsByID, ReportRuleWithDraft } from './report-rules.types';

/**
 * reportSortOptions lists supported report sorting modes.
 */
export const reportSortOptions: readonly ReportSortMode[] = [
	'name',
	'first_submitted',
	'last_submitted',
	'missing_first',
	'blockers_first',
];

/**
 * buildReportRuleDrafts maps report rules into editable drafts.
 */
export function buildReportRuleDrafts(rules: readonly ReportRule[]): ReportRuleDraftsByID {
	const drafts: ReportRuleDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reportRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reportRuleToDraft maps one report rule to editable state.
 */
export function reportRuleToDraft(rule: ReportRule): ReportRuleDraft {
	return {
		enabled: rule.enabled,
		postToChannel: rule.postToChannel,
		previewRequired: rule.previewRequired,
		sortMode: rule.sortMode,
		includeOnLeave: rule.includeOnLeave,
		includeMissing: rule.includeMissing,
		includeTime: rule.includeTime,
		includeBlockers: rule.includeBlockers,
	};
}

/**
 * pairRulesWithDrafts returns renderable report rule/draft pairs.
 */
export function pairRulesWithDrafts(
	rules: readonly ReportRule[],
	drafts: ReportRuleDraftsByID,
): readonly ReportRuleWithDraft[] {
	return rules
		.map(rule => {
			const draft = drafts[rule.id];

			if (draft === undefined) {
				return null;
			}

			return {
				rule,
				draft,
			};
		})
		.filter((pair): pair is ReportRuleWithDraft => pair !== null);
}

/**
 * sortReportRules returns report rules grouped by report kind and schedule.
 */
export function sortReportRules(rules: readonly ReportRule[]): readonly ReportRule[] {
	return [...rules].sort((first, second) => {
		if (first.reportKind === second.reportKind) {
			return first.scheduleId.localeCompare(second.scheduleId);
		}

		return first.reportKind.localeCompare(second.reportKind);
	});
}

/**
 * replaceReportRule replaces one report rule in a readonly list.
 */
export function replaceReportRule(rules: readonly ReportRule[], updatedRule: ReportRule): readonly ReportRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * reportRuleHasChanges returns whether a draft differs from the saved rule.
 */
export function reportRuleHasChanges(rule: ReportRule, draft: ReportRuleDraft): boolean {
	return (
		rule.enabled !== draft.enabled ||
		rule.postToChannel !== draft.postToChannel ||
		rule.previewRequired !== draft.previewRequired ||
		rule.sortMode !== draft.sortMode ||
		rule.includeOnLeave !== draft.includeOnLeave ||
		rule.includeMissing !== draft.includeMissing ||
		rule.includeTime !== draft.includeTime ||
		rule.includeBlockers !== draft.includeBlockers
	);
}

/**
 * toReportSortMode narrows a select value to a report sort mode.
 */
export function toReportSortMode(value: string): ReportSortMode {
	if (value === 'name' || value === 'last_submitted' || value === 'missing_first' || value === 'blockers_first') {
		return value;
	}

	return 'first_submitted';
}

/**
 * formatReportSortMode returns a readable report sort label.
 */
export function formatReportSortMode(sortMode: ReportSortMode): string {
	return formatLabel(sortMode);
}

/**
 * formatReportKind returns a readable report kind label.
 */
export function formatReportKind(reportKind: ReportKind): string {
	return formatLabel(reportKind);
}

/**
 * enabledReportRuleCount returns enabled rule count.
 */
export function enabledReportRuleCount(rules: readonly ReportRule[]): number {
	return rules.filter(rule => rule.enabled).length;
}

/**
 * autoPostReportRuleCount returns auto-post rule count.
 */
export function autoPostReportRuleCount(rules: readonly ReportRule[]): number {
	return rules.filter(rule => rule.postToChannel).length;
}

/**
 * previewRequiredReportRuleCount returns preview-required rule count.
 */
export function previewRequiredReportRuleCount(rules: readonly ReportRule[]): number {
	return rules.filter(rule => rule.previewRequired).length;
}

/**
 * blockerReportRuleCount returns blocker-including rule count.
 */
export function blockerReportRuleCount(rules: readonly ReportRule[]): number {
	return rules.filter(rule => rule.includeBlockers).length;
}

/**
 * shortID returns a short readable ID label.
 */
export function shortID(value: string): string {
	if (value.length <= 8) {
		return value;
	}

	return value.slice(0, 8);
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * reportRuleCardClassName returns the style for one report-rule card.
 */
export function reportRuleCardClassName(active: boolean): string {
	return cn(
		'cf:grid cf:gap-5 cf:rounded-2xl cf:border cf:p-5 cf:transition',
		active ? 'cf:border-white/10 cf:bg-white/[0.045]' : 'cf:border-white/10 cf:bg-white/[0.025] cf:opacity-80',
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

	return 'Could not update report settings.';
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
