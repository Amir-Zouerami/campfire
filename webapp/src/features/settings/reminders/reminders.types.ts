import type { ReminderRule } from '@/types/domain';

/**
 * ReminderSettingsLoadState describes reminder settings loading and mutation state.
 */
export type ReminderSettingsLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ReminderRuleDraft contains editable reminder settings for one rule.
 */
export type ReminderRuleDraft = {
	readonly enabled: boolean;
	readonly channelReminderEnabled: boolean;
	readonly dmReminderEnabled: boolean;
	readonly reminderTimes: readonly string[];
	readonly mentionMissingInChannel: boolean;
};

/**
 * ReminderRuleDraftPatch updates part of one reminder rule draft.
 */
export type ReminderRuleDraftPatch = Partial<ReminderRuleDraft>;

/**
 * ReminderDraftsByID stores reminder drafts by reminder rule ID.
 */
export type ReminderDraftsByID = Record<string, ReminderRuleDraft>;

/**
 * ReminderRuleWithDraft pairs a loaded reminder rule with its editable draft.
 */
export type ReminderRuleWithDraft = {
	readonly rule: ReminderRule;
	readonly draft: ReminderRuleDraft;
};
