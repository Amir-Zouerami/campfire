import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { listReportRules, listStandupConfiguration, updateReportRule } from '@/api';
import type { ReportRule, Workspace } from '@/types/domain';

import { buildStandupScheduleLabelLookup, type StandupScheduleLabelLookup } from '../standup-schedule-labels';

import {
	autoPostReportRuleCount,
	blockerReportRuleCount,
	buildReportRuleDrafts,
	enabledReportRuleCount,
	errorToMessage,
	pairRulesWithDrafts,
	previewRequiredReportRuleCount,
	replaceReportRule,
	reportRuleToDraft,
	sortReportRules,
} from './report-rules.helpers';
import type {
	ReportRuleDraftPatch,
	ReportRuleDraftsByID,
	ReportRulesLoadState,
	ReportRuleWithDraft,
} from './report-rules.types';

/**
 * UseReportRulesInput contains workspace context and edit permissions.
 */
type UseReportRulesInput = {
	readonly workspace: Workspace;
	readonly canManageReportRules: boolean;
};

/**
 * UseReportRulesResult contains report rules state and actions.
 */
export type UseReportRulesResult = {
	readonly loadState: ReportRulesLoadState;
	readonly rules: readonly ReportRule[];
	readonly sortedRules: readonly ReportRule[];
	readonly drafts: ReportRuleDraftsByID;
	readonly rulesWithDrafts: readonly ReportRuleWithDraft[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
	readonly savingRuleID: string;
	readonly message: string;
	readonly isBusy: boolean;
	readonly enabledCount: number;
	readonly autoPostCount: number;
	readonly previewRequiredCount: number;
	readonly blockerCount: number;
	readonly updateDraft: (ruleID: string, patch: ReportRuleDraftPatch) => void;
	readonly saveRule: (rule: ReportRule) => Promise<void>;
};

/**
 * useReportRules owns report-rule loading, schedule labeling, draft editing, and saving.
 */
export function useReportRules(input: UseReportRulesInput): UseReportRulesResult {
	const [loadState, setLoadState] = useState<ReportRulesLoadState>('idle');
	const [rules, setRules] = useState<readonly ReportRule[]>([]);
	const [drafts, setDrafts] = useState<ReportRuleDraftsByID>({});
	const [scheduleLabels, setScheduleLabels] = useState<StandupScheduleLabelLookup>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadReportRules loads workspace report rules and readable standup schedule labels.
		 */
		async function loadReportRules(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [rulesResponse, configurationResponse] = await Promise.all([
					listReportRules(input.workspace.id),
					listStandupConfiguration(input.workspace.id),
				]);

				if (!isActive) {
					return;
				}

				setRules(rulesResponse.reportRules);
				setDrafts(buildReportRuleDrafts(rulesResponse.reportRules));
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

		void loadReportRules();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id]);

	const sortedRules = useMemo(() => sortReportRules(rules), [rules]);
	const rulesWithDrafts = useMemo(() => pairRulesWithDrafts(sortedRules, drafts), [sortedRules, drafts]);

	const enabledCount = useMemo(() => enabledReportRuleCount(rules), [rules]);
	const autoPostCount = useMemo(() => autoPostReportRuleCount(rules), [rules]);
	const previewRequiredCount = useMemo(() => previewRequiredReportRuleCount(rules), [rules]);
	const blockerCount = useMemo(() => blockerReportRuleCount(rules), [rules]);
	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * updateDraft patches one report-rule draft.
	 */
	function updateDraft(ruleID: string, patch: ReportRuleDraftPatch): void {
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
	 * saveRule persists one report rule draft.
	 */
	async function saveRule(rule: ReportRule): Promise<void> {
		if (!input.canManageReportRules) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage report rules.');
			return;
		}

		const draft = drafts[rule.id];

		if (draft === undefined) {
			setLoadState('error');
			setMessage('Report rule draft was not found.');
			return;
		}

		setLoadState('saving');
		setSavingRuleID(rule.id);
		setMessage('');

		try {
			const response = await updateReportRule(input.workspace.id, rule.id, {
				enabled: draft.enabled,
				postToChannel: draft.postToChannel,
				previewRequired: draft.previewRequired,
				sortMode: draft.sortMode,
				includeOnLeave: draft.includeOnLeave,
				includeMissing: draft.includeMissing,
				includeTime: draft.includeTime,
				includeBlockers: draft.includeBlockers,
			});

			setRules(current => replaceReportRule(current, response.reportRule));
			setDrafts(current => ({
				...current,
				[response.reportRule.id]: reportRuleToDraft(response.reportRule),
			}));
			setSavingRuleID('');
			setLoadState('ready');
			setMessage('Report rule updated.');
			toast.success('Report rule updated');
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
		scheduleLabels,
		savingRuleID,
		message,
		isBusy,
		enabledCount,
		autoPostCount,
		previewRequiredCount,
		blockerCount,
		updateDraft,
		saveRule,
	};
}