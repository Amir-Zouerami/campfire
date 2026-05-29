import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { listReminderRules, listStandupConfiguration, updateReminderRule } from '@/api';
import type { ReminderRule, Workspace } from '@/types/domain';

import { buildStandupScheduleLabelLookup, type StandupScheduleLabelLookup } from '../standup-schedule-labels';

import {
	buildReminderDrafts,
	channelReminderRuleCount,
	dmReminderRuleCount,
	enabledReminderRuleCount,
	errorToMessage,
	pairRulesWithDrafts,
	parseReminderOffsets,
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
	readonly isBusy: boolean;
	readonly enabledCount: number;
	readonly dmEnabledCount: number;
	readonly channelEnabledCount: number;
	readonly offsetCount: number;
	readonly updateDraft: (ruleID: string, patch: ReminderRuleDraftPatch) => void;
	readonly saveRule: (rule: ReminderRule) => Promise<void>;
};

/**
 * useReminderSettings owns reminder rule loading, schedule labeling, draft editing, and saving.
 */
export function useReminderSettings(input: UseReminderSettingsInput): UseReminderSettingsResult {
	const [loadState, setLoadState] = useState<ReminderSettingsLoadState>('idle');
	const [rules, setRules] = useState<readonly ReminderRule[]>([]);
	const [drafts, setDrafts] = useState<ReminderDraftsByID>({});
	const [scheduleLabels, setScheduleLabels] = useState<StandupScheduleLabelLookup>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadReminderRules loads workspace reminder rules and their readable schedule context.
		 */
		async function loadReminderRules(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [rulesResponse, configurationResponse] = await Promise.all([
					listReminderRules(input.workspace.id),
					listStandupConfiguration(input.workspace.id),
				]);

				if (!isActive) {
					return;
				}

				setRules(rulesResponse.reminderRules);
				setDrafts(buildReminderDrafts(rulesResponse.reminderRules));
				setScheduleLabels(
					buildStandupScheduleLabelLookup(configurationResponse.templates, configurationResponse.schedules),
				);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadReminderRules();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id]);

	const sortedRules = useMemo(() => sortReminderRules(rules), [rules]);
	const rulesWithDrafts = useMemo(() => pairRulesWithDrafts(sortedRules, drafts), [sortedRules, drafts]);

	const enabledCount = useMemo(() => enabledReminderRuleCount(rules), [rules]);
	const dmEnabledCount = useMemo(() => dmReminderRuleCount(rules), [rules]);
	const channelEnabledCount = useMemo(() => channelReminderRuleCount(rules), [rules]);
	const offsetCount = useMemo(() => totalReminderOffsetCount(rules), [rules]);
	const isBusy = loadState === 'loading' || loadState === 'saving';

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
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage reminder settings.');
			return;
		}

		const draft = drafts[rule.id];
		if (draft === undefined) {
			setLoadState('error');
			setMessage('Reminder draft was not found.');
			return;
		}

		const parsedOffsets = parseReminderOffsets(draft.reminderOffsetsText);

		setLoadState('saving');
		setSavingRuleID(rule.id);
		setMessage('');

		try {
			const response = await updateReminderRule(input.workspace.id, rule.id, {
				enabled: draft.enabled,
				channelReminderEnabled: draft.channelReminderEnabled,
				dmReminderEnabled: draft.dmReminderEnabled,
				reminderOffsets: parsedOffsets,
				mentionMissingInChannel: draft.mentionMissingInChannel,
			});

			setRules(current => replaceReminderRule(current, response.reminderRule));
			setDrafts(current => ({
				...current,
				[response.reminderRule.id]: reminderRuleToDraft(response.reminderRule),
			}));
			setLoadState('ready');
			setMessage('Reminder rule updated.');
			toast.success('Reminder rule updated');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		} finally {
			setSavingRuleID('');
		}
	}

	return {
		loadState,
		rules,
		sortedRules,
		drafts,
		rulesWithDrafts,
		scheduleLabels,
		savingRuleID,
		message,
		isBusy,
		enabledCount,
		dmEnabledCount,
		channelEnabledCount,
		offsetCount,
		updateDraft,
		saveRule,
	};
}