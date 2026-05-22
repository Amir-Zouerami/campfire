import type { ReportRule, ReportSortMode } from '@/types/domain';

/**
 * ReportRulesLoadState describes report-rule loading and mutation state.
 */
export type ReportRulesLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ReportRuleDraft contains editable report-rule fields.
 */
export type ReportRuleDraft = {
	readonly enabled: boolean;
	readonly postToChannel: boolean;
	readonly previewRequired: boolean;
	readonly sortMode: ReportSortMode;
	readonly includeOnLeave: boolean;
	readonly includeMissing: boolean;
	readonly includeTime: boolean;
	readonly includeBlockers: boolean;
};

/**
 * ReportRuleDraftPatch updates part of one report-rule draft.
 */
export type ReportRuleDraftPatch = Partial<ReportRuleDraft>;

/**
 * ReportRuleDraftsByID stores editable report-rule drafts by rule ID.
 */
export type ReportRuleDraftsByID = Record<string, ReportRuleDraft>;

/**
 * ReportRuleWithDraft pairs a loaded report rule with its editable draft.
 */
export type ReportRuleWithDraft = {
	readonly rule: ReportRule;
	readonly draft: ReportRuleDraft;
};
