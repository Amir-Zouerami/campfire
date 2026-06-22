import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listReportRules, listStandupConfiguration, updateReportRule } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
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
 * ReportRulesSettingsSnapshot is the query-owned report-rule aggregate.
 */
type ReportRulesSettingsSnapshot = {
	readonly rules: readonly ReportRule[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
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
	readonly messageTone: 'success' | 'error';
	readonly isBusy: boolean;
	readonly enabledCount: number;
	readonly autoPostCount: number;
	readonly previewRequiredCount: number;
	readonly blockerCount: number;
	readonly updateDraft: (ruleID: string, patch: ReportRuleDraftPatch) => void;
	readonly saveRule: (rule: ReportRule) => Promise<void>;
};

/**
 * useReportRules owns report-rule query state, drafts, and mutations.
 */
export function useReportRules(input: UseReportRulesInput): UseReportRulesResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [drafts, setDrafts] = useState<ReportRuleDraftsByID>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');
	const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

	const queryKey = campfireQueryKeys.reportRulesSettings(input.workspace.id);
	const settingsQuery = useQuery({
		queryKey,
		queryFn: async (): Promise<ReportRulesSettingsSnapshot> => {
			const [rulesResponse, configurationResponse] = await Promise.all([
				listReportRules(input.workspace.id),
				listStandupConfiguration(input.workspace.id),
			]);

			return {
				rules: rulesResponse.reportRules,
				scheduleLabels: buildStandupScheduleLabelLookup(
					configurationResponse.templates,
					configurationResponse.schedules,
				),
			};
		},
	});

	useEffect(() => {
		if (settingsQuery.data === undefined) {
			return;
		}

		setDrafts(buildReportRuleDrafts(settingsQuery.data.rules));
	}, [settingsQuery.data]);

	const updateMutation = useMutation({
		mutationFn: async (rule: ReportRule) => {
			const draft = drafts[rule.id];
			if (draft === undefined) {
				throw new Error(t('settings.reportRules.error.draftMissing'));
			}

			return updateReportRule(input.workspace.id, rule.id, {
				enabled: draft.enabled,
				postToChannel: draft.postToChannel,
				previewRequired: draft.previewRequired,
				sortMode: draft.sortMode,
				reportLanguage: draft.reportLanguage,
				includeOnLeave: draft.includeOnLeave,
				includeMissing: draft.includeMissing,
				includeTime: draft.includeTime,
				includeBlockers: draft.includeBlockers,
			});
		},
		onSuccess: response => {
			queryClient.setQueryData<ReportRulesSettingsSnapshot>(queryKey, current => {
				if (current === undefined) {
					return current;
				}

				return {
					...current,
					rules: replaceReportRule(current.rules, response.reportRule),
				};
			});

			setDrafts(current => ({
				...current,
				[response.reportRule.id]: reportRuleToDraft(response.reportRule),
			}));
			setSavingRuleID('');
			setMessage(t('settings.reportRules.toast.updated'));
			setMessageTone('success');
			toast.success(t('settings.reportRules.toast.updated'));
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
	const sortedRules = useMemo(() => sortReportRules(rules), [rules]);
	const rulesWithDrafts = useMemo(() => pairRulesWithDrafts(sortedRules, drafts), [sortedRules, drafts]);

	const enabledCount = useMemo(() => enabledReportRuleCount(rules), [rules]);
	const autoPostCount = useMemo(() => autoPostReportRuleCount(rules), [rules]);
	const previewRequiredCount = useMemo(() => previewRequiredReportRuleCount(rules), [rules]);
	const blockerCount = useMemo(() => blockerReportRuleCount(rules), [rules]);
	const loadState = deriveReportRulesLoadState(settingsQuery.isLoading, settingsQuery.isError, updateMutation.isPending, rules);
	const isBusy = settingsQuery.isLoading || updateMutation.isPending;
	const currentMessage = settingsQuery.isError ? errorToMessage(settingsQuery.error, t) : message;

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
			setMessage(t('settings.reportRules.error.permission'));
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
		autoPostCount,
		previewRequiredCount,
		blockerCount,
		updateDraft,
		saveRule,
	};
}

/**
 * deriveReportRulesLoadState keeps rendering independent from TanStack internals.
 */
function deriveReportRulesLoadState(
	isLoading: boolean,
	isError: boolean,
	isSaving: boolean,
	rules: readonly ReportRule[],
): ReportRulesLoadState {
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
