import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { listReminderRules, updateReminderRule } from '@/api';
import type { ReminderRule, Workspace } from '@/types/domain';

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
 * useReminderSettings owns reminder rule loading, draft editing, and saving.
 */
export function useReminderSettings(input: UseReminderSettingsInput): UseReminderSettingsResult {
	const [loadState, setLoadState] = useState<ReminderSettingsLoadState>('idle');
	const [rules, setRules] = useState<readonly ReminderRule[]>([]);
	const [drafts, setDrafts] = useState<ReminderDraftsByID>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadReminderRules loads workspace reminder rules.
		 */
		async function loadReminderRules(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listReminderRules(input.workspace.id);

				if (!isActive) {
					return;
				}

				const channelOnlyRules = response.reminderRules.map(rule => ({
					...rule,
					dmReminderEnabled: false,
				}));

				setRules(channelOnlyRules);
				setDrafts(buildReminderDrafts(channelOnlyRules));
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
			setMessage('Could not find reminder settings to save.');
			return;
		}

		const offsets = parseReminderOffsets(draft.reminderOffsetsText);

		if (offsets.length === 0) {
			setLoadState('error');
			setMessage('Enter at least one reminder offset, such as 0, 30, 45, 55.');
			return;
		}

		setLoadState('saving');
		setSavingRuleID(rule.id);
		setMessage('');

		try {
			const response = await updateReminderRule(input.workspace.id, rule.id, {
				enabled: draft.enabled,
				channelReminderEnabled: draft.channelReminderEnabled,
				dmReminderEnabled: false,
				reminderOffsets: [...offsets],
				mentionMissingInChannel: draft.mentionMissingInChannel,
			});

			setRules(current => replaceReminderRule(current, response.reminderRule));
			setDrafts(current => ({
				...current,
				[response.reminderRule.id]: reminderRuleToDraft(response.reminderRule),
			}));
			setSavingRuleID('');
			setLoadState('ready');
			setMessage('Reminder settings updated.');
			toast.success('Reminder settings updated');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setSavingRuleID('');
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		rules,
		sortedRules,
		drafts,
		rulesWithDrafts,
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
