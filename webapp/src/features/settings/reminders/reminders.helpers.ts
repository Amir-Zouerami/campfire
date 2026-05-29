import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { ReminderRule } from '@/types/domain';

import type { ReminderDraftsByID, ReminderRuleDraft, ReminderRuleWithDraft } from './reminders.types';

/**
 * buildReminderDrafts maps reminder rules into editable drafts.
 */
export function buildReminderDrafts(rules: readonly ReminderRule[]): ReminderDraftsByID {
	const drafts: ReminderDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reminderRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reminderRuleToDraft maps one reminder rule into editable state.
 */
export function reminderRuleToDraft(rule: ReminderRule): ReminderRuleDraft {
	return {
		enabled: rule.enabled,
		channelReminderEnabled: rule.channelReminderEnabled,
		dmReminderEnabled: rule.dmReminderEnabled,
		reminderOffsetsText: rule.reminderOffsets.join(', '),
		mentionMissingInChannel: rule.mentionMissingInChannel,
	};
}

/**
 * pairRulesWithDrafts returns renderable reminder rule/draft pairs.
 */
export function pairRulesWithDrafts(
	rules: readonly ReminderRule[],
	drafts: ReminderDraftsByID,
): readonly ReminderRuleWithDraft[] {
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
		.filter((pair): pair is ReminderRuleWithDraft => pair !== null);
}

/**
 * sortReminderRules returns reminder rules in stable schedule order.
 */
export function sortReminderRules(rules: readonly ReminderRule[]): readonly ReminderRule[] {
	return [...rules].sort((first, second) => first.scheduleId.localeCompare(second.scheduleId));
}

/**
 * parseReminderOffsets parses comma/space/newline-separated minute offsets inside the one-hour pre-report reminder window.
 */
export function parseReminderOffsets(value: string): readonly number[] {
	const offsets = value
		.split(/[\s,]+/)
		.map(part => Number.parseInt(part.trim(), 10))
		.filter(offset => Number.isInteger(offset) && offset >= 0 && offset <= 59);

	return [...new Set(offsets)].sort((first, second) => first - second);
}

/**
 * replaceReminderRule replaces one reminder rule in a readonly list.
 */
export function replaceReminderRule(
	rules: readonly ReminderRule[],
	updatedRule: ReminderRule,
): readonly ReminderRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * reminderRuleHasChanges returns whether a draft differs from the saved rule.
 */
export function reminderRuleHasChanges(rule: ReminderRule, draft: ReminderRuleDraft): boolean {
	const offsets = parseReminderOffsets(draft.reminderOffsetsText);

	return (
		rule.enabled !== draft.enabled ||
		rule.channelReminderEnabled !== draft.channelReminderEnabled ||
		rule.dmReminderEnabled !== draft.dmReminderEnabled ||
		rule.mentionMissingInChannel !== draft.mentionMissingInChannel ||
		rule.reminderOffsets.join(',') !== offsets.join(',')
	);
}

/**
 * enabledReminderRuleCount returns enabled rule count.
 */
export function enabledReminderRuleCount(rules: readonly ReminderRule[]): number {
	return rules.filter(rule => rule.enabled).length;
}

/**
 * dmReminderRuleCount returns DM-enabled rule count.
 */
export function dmReminderRuleCount(rules: readonly ReminderRule[]): number {
	return rules.filter(rule => rule.dmReminderEnabled).length;
}

/**
 * channelReminderRuleCount returns channel-reminder-enabled rule count.
 */
export function channelReminderRuleCount(rules: readonly ReminderRule[]): number {
	return rules.filter(rule => rule.channelReminderEnabled).length;
}

/**
 * totalReminderOffsetCount returns total configured reminder points across rules.
 */
export function totalReminderOffsetCount(rules: readonly ReminderRule[]): number {
	return rules.reduce((total, rule) => total + rule.reminderOffsets.length, 0);
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
 * reminderRuleCardClassName returns the style for one reminder rule card.
 */
export function reminderRuleCardClassName(active: boolean): string {
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

	return 'Could not update reminder settings.';
}
