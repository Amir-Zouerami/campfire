import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type { ReminderRule } from '@/types/domain';

import type { StandupScheduleLabelLookup } from '../standup-schedule-labels';
import type { ReminderDraftsByID, ReminderRuleDraft, ReminderRuleWithDraft } from './reminders.types';

const MAX_REMINDER_TIMES = 3;

/**
 * buildReminderDrafts maps reminder rules into editable drafts.
 */
export function buildReminderDrafts(
	rules: readonly ReminderRule[],
	scheduleLabels: StandupScheduleLabelLookup,
): ReminderDraftsByID {
	const drafts: ReminderDraftsByID = {};

	for (const rule of rules) {
		const label = scheduleLabels[rule.scheduleId];
		drafts[rule.id] = reminderRuleToDraft(rule, label?.opensAt ?? '09:30', label?.timeOfDay ?? '10:00');
	}

	return drafts;
}

/**
 * reminderRuleToDraft maps one reminder rule into editable state.
 */
export function reminderRuleToDraft(rule: ReminderRule, opensAt: string, closeTime: string): ReminderRuleDraft {
	return {
		enabled: rule.enabled,
		channelReminderEnabled: rule.channelReminderEnabled,
		dmReminderEnabled: rule.dmReminderEnabled,
		reminderTimes: reminderOffsetsToTimes(rule.reminderOffsets, opensAt, closeTime),
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
 * reminderOffsetsToTimes converts stored offset minutes after open to up to three visible HH:mm reminder times.
 */
export function reminderOffsetsToTimes(
	offsets: readonly number[],
	opensAt: string,
	closeTime: string,
): readonly string[] {
	const openMinutes = timeToMinutes(opensAt);
	const closeMinutes = timeToMinutes(closeTime);

	if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
		return ['', '', ''];
	}

	const windowMinutes = closeMinutes - openMinutes;
	const times = [...new Set(offsets)]
		.filter(offset => Number.isInteger(offset) && offset >= 0 && offset < windowMinutes)
		.sort((first, second) => first - second)
		.slice(0, MAX_REMINDER_TIMES)
		.map(offset => minutesToTime(openMinutes + offset));

	return reminderTimeSlots(times);
}

/**
 * parseReminderTimes converts up to three user-facing HH:mm values into stored scheduler offsets after open.
 */
export function parseReminderTimes(times: readonly string[], opensAt: string, closeTime: string): readonly number[] {
	const openMinutes = timeToMinutes(opensAt);
	const closeMinutes = timeToMinutes(closeTime);

	if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
		return [];
	}

	const offsets = times
		.slice(0, MAX_REMINDER_TIMES)
		.map(value => timeToMinutes(value))
		.filter((value): value is number => value !== null)
		.filter(value => value >= openMinutes && value < closeMinutes)
		.map(value => value - openMinutes);

	return [...new Set(offsets)].sort((first, second) => first - second);
}

/**
 * reminderTimeValidationMessage returns readable guidance for reminder times.
 */
export function reminderTimeValidationMessage(times: readonly string[], opensAt: string, closeTime: string): string {
	const enteredTimes = times.map(value => value.trim()).filter(value => value !== '');

	if (enteredTimes.length === 0) {
		return `Choose at least one reminder between ${opensAt} and ${closeTime}.`;
	}

	const validTimes = parseReminderTimes(times, opensAt, closeTime);
	if (validTimes.length === 0) {
		return `Reminder times must be after ${opensAt} and before ${closeTime}.`;
	}

	if (validTimes.length !== new Set(enteredTimes).size) {
		return `Only reminder times after ${opensAt} and before ${closeTime} will be saved.`;
	}

	return '';
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
export function reminderRuleHasChanges(rule: ReminderRule, draft: ReminderRuleDraft, opensAt: string, closeTime: string): boolean {
	const offsets = parseReminderTimes(draft.reminderTimes, opensAt, closeTime);
	const storedComparableOffsets = reminderOffsetsToTimes(rule.reminderOffsets, opensAt, closeTime);
	const storedOffsets = parseReminderTimes(storedComparableOffsets, opensAt, closeTime);

	return (
		rule.enabled !== draft.enabled ||
		rule.channelReminderEnabled !== draft.channelReminderEnabled ||
		rule.dmReminderEnabled !== draft.dmReminderEnabled ||
		rule.mentionMissingInChannel !== draft.mentionMissingInChannel ||
		storedOffsets.join(',') !== offsets.join(',')
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
	return rules.reduce((total, rule) => total + Math.min(rule.reminderOffsets.length, MAX_REMINDER_TIMES), 0);
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
		'cf:grid cf:gap-8 cf:rounded-3xl cf:border cf:p-8 cf:transition',
		active ? 'cf:border-white/10 cf:bg-white/[0.04]' : 'cf:border-white/10 cf:bg-white/[0.025] cf:opacity-80',
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

/**
 * reminderTimeSlots returns exactly three reminder time slots.
 */
function reminderTimeSlots(times: readonly string[]): readonly string[] {
	return [times[0] ?? '', times[1] ?? '', times[2] ?? ''];
}

/**
 * minutesToTime formats minutes after local midnight as HH:mm.
 */
function minutesToTime(minutes: number): string {
	const normalized = (minutes + 24 * 60) % (24 * 60);
	const hour = Math.floor(normalized / 60);
	const minute = normalized % 60;

	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * timeToMinutes parses HH:mm into minutes after local midnight.
 */
function timeToMinutes(value: string): number | null {
	const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
	if (match === null) {
		return null;
	}

	const hour = Number.parseInt(match[1] ?? '', 10);
	const minute = Number.parseInt(match[2] ?? '', 10);

	if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return null;
	}

	return hour * 60 + minute;
}
