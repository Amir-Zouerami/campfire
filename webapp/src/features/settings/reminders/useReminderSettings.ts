import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listReminderRules, listStandupConfiguration, updateReminderRule } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { ReminderRule, Workspace } from '@/types/domain';

import { buildStandupScheduleLabelLookup, type StandupScheduleLabelLookup } from '../standup-schedule-labels';

import {
	buildReminderDrafts,
	channelReminderRuleCount,
	dmReminderRuleCount,
	enabledReminderRuleCount,
	errorToMessage,
	pairRulesWithDrafts,
	parseReminderTimes,
	reminderRuleToDraft,
	replaceReminderRule,
	sortReminderRules,
	totalReminderOffsetCount,
} from './reminders.helpers';
import type {
	ReminderDraftsByID,
	ReminderRuleDraftPatch,
	ReminderRuleWithDraft,
	ReminderSettingsLoadState,
} from './reminders.types';

/**
 * UseReminderSettingsInput contains workspace context and edit permissions.
 */
type UseReminderSettingsInput = {
	readonly workspace: Workspace;
	readonly canManageReminders: boolean;
};

/**
 * ReminderSettingsSnapshot is the query-owned reminder settings aggregate.
 */
type ReminderSettingsSnapshot = {
	readonly rules: readonly ReminderRule[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
};

/**
 * UseReminderSettingsResult contains reminder settings state and actions.
 */
export type UseReminderSettingsResult = {
	readonly loadState: ReminderSettingsLoadState;
	readonly rules: readonly ReminderRule[];
	readonly sortedRules: readonly ReminderRule[];
	readonly drafts: ReminderDraftsByID;
	readonly rulesWithDrafts: readonly ReminderRuleWithDraft[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
	readonly savingRuleID: string;
	readonly message: string;
	readonly messageTone: 'success' | 'error';
	readonly isBusy: boolean;
	readonly enabledCount: number;
	readonly dmEnabledCount: number;
	readonly channelEnabledCount: number;
	readonly offsetCount: number;
	readonly updateDraft: (ruleID: string, patch: ReminderRuleDraftPatch) => void;
	readonly saveRule: (rule: ReminderRule) => Promise<void>;
};

/**
 * useReminderSettings owns reminder rule query state, drafts, and mutations.
 */
export function useReminderSettings(input: UseReminderSettingsInput): UseReminderSettingsResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [drafts, setDrafts] = useState<ReminderDraftsByID>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');
	const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

	const queryKey = campfireQueryKeys.reminderSettings(input.workspace.id);
	const settingsQuery = useQuery({
		queryKey,
		queryFn: async (): Promise<ReminderSettingsSnapshot> => {
			const [rulesResponse, configurationResponse] = await Promise.all([
				listReminderRules(input.workspace.id),
				listStandupConfiguration(input.workspace.id),
			]);
			const scheduleLabels = buildStandupScheduleLabelLookup(
				configurationResponse.templates,
				configurationResponse.schedules,
			);

			return {
				rules: rulesResponse.reminderRules,
				scheduleLabels,
			};
		},
	});

	useEffect(() => {
		if (settingsQuery.data === undefined) {
			return;
		}

		setDrafts(buildReminderDrafts(settingsQuery.data.rules, settingsQuery.data.scheduleLabels));
	}, [settingsQuery.data]);

	const updateMutation = useMutation({
		mutationFn: async (rule: ReminderRule) => {
			const draft = drafts[rule.id];
			const scheduleLabel = settingsQuery.data?.scheduleLabels[rule.scheduleId];
			const opensAt = scheduleLabel?.opensAt ?? '09:30';
			const closeTime = scheduleLabel?.timeOfDay ?? '10:00';

			if (draft === undefined) {
				throw new Error(t('settings.reminders.error.draftMissing'));
			}

			const parsedOffsets = parseReminderTimes(draft.reminderTimes, opensAt, closeTime);
			if (parsedOffsets.length === 0) {
				throw new Error(t('settings.reminders.validation.chooseOne', { openTime: opensAt, closeTime }));
			}

			return updateReminderRule(input.workspace.id, rule.id, {
				enabled: draft.enabled,
				channelReminderEnabled: draft.channelReminderEnabled,
				dmReminderEnabled: draft.dmReminderEnabled,
				reminderOffsets: parsedOffsets,
				mentionMissingInChannel: draft.mentionMissingInChannel,
			});
		},
		onSuccess: response => {
			queryClient.setQueryData<ReminderSettingsSnapshot>(queryKey, current => {
				if (current === undefined) {
					return current;
				}

				return {
					...current,
					rules: replaceReminderRule(current.rules, response.reminderRule),
				};
			});

			const scheduleLabel = settingsQuery.data?.scheduleLabels[response.reminderRule.scheduleId];
			const opensAt = scheduleLabel?.opensAt ?? '09:30';
			const closeTime = scheduleLabel?.timeOfDay ?? '10:00';
			setDrafts(current => ({
				...current,
				[response.reminderRule.id]: reminderRuleToDraft(response.reminderRule, opensAt, closeTime),
			}));
			setSavingRuleID('');
			setMessage(t('settings.reminders.toast.updated'));
			setMessageTone('success');
			toast.success(t('settings.reminders.toast.updated'));
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);
			setSavingRuleID('');
			setMessage(errorMessage);
			setMessageTone('error');
			toast.error(errorMessage);
		},
	});

	const rules = settingsQuery.data?.rules ?? [];
	const scheduleLabels = settingsQuery.data?.scheduleLabels ?? {};
	const sortedRules = useMemo(() => sortReminderRules(rules), [rules]);
	const rulesWithDrafts = useMemo(() => pairRulesWithDrafts(sortedRules, drafts), [sortedRules, drafts]);

	const enabledCount = useMemo(() => enabledReminderRuleCount(rules), [rules]);
	const dmEnabledCount = useMemo(() => dmReminderRuleCount(rules), [rules]);
	const channelEnabledCount = useMemo(() => channelReminderRuleCount(rules), [rules]);
	const offsetCount = useMemo(() => totalReminderOffsetCount(rules), [rules]);
	const loadState = deriveReminderLoadState(settingsQuery.isLoading, settingsQuery.isError, updateMutation.isPending, rules);
	const isBusy = settingsQuery.isLoading || updateMutation.isPending;
	const currentMessage = settingsQuery.isError ? errorToMessage(settingsQuery.error, t) : message;

	/**
	 * updateDraft patches one reminder rule draft.
	 */
	function updateDraft(ruleID: string, patch: ReminderRuleDraftPatch): void {
		setDrafts(current => {
			const existingDraft = current[ruleID];

			if (existingDraft === undefined) {
				return current;
			}

			return {
				...current,
				[ruleID]: {
					...existingDraft,
					...patch,
				},
			};
		});
	}

	/**
	 * saveRule persists one reminder rule draft.
	 */
	async function saveRule(rule: ReminderRule): Promise<void> {
		if (!input.canManageReminders) {
			setMessage(t('settings.reminders.error.permission'));
			setMessageTone('error');
			return;
		}

		setSavingRuleID(rule.id);
		setMessage('');
		setMessageTone('success');
		await updateMutation.mutateAsync(rule).catch(() => undefined);
	}

	return {
		loadState,
		rules,
		sortedRules,
		drafts,
		rulesWithDrafts,
		scheduleLabels,
		savingRuleID,
		message: currentMessage,
		messageTone: settingsQuery.isError ? 'error' : messageTone,
		isBusy,
		enabledCount,
		dmEnabledCount,
		channelEnabledCount,
		offsetCount,
		updateDraft,
		saveRule,
	};
}

/**
 * deriveReminderLoadState keeps rendering independent from TanStack internals.
 */
function deriveReminderLoadState(
	isLoading: boolean,
	isError: boolean,
	isSaving: boolean,
	rules: readonly ReminderRule[],
): ReminderSettingsLoadState {
	if (isSaving) {
		return 'saving';
	}

	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	if (rules.length > 0) {
		return 'ready';
	}

	return 'idle';
}
