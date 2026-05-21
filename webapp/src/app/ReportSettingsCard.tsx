import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CheckCircle2, FileText, Loader2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, listReportRules, updateReportRule } from '@/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ReportRule, ReportSortMode, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

/**
 * ReportSettingsCardProps contains workspace report settings data.
 */
type ReportSettingsCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
};

/**
 * LoadState describes the report settings panel state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ReportRuleDraft contains editable report-rule fields.
 */
type ReportRuleDraft = {
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
 * ReportDraftsByID stores editable report drafts by report rule ID.
 */
type ReportDraftsByID = Record<string, ReportRuleDraft>;

const reportSortOptions: readonly ReportSortMode[] = [
	'name',
	'first_submitted',
	'last_submitted',
	'missing_first',
	'blockers_first',
];

/**
 * ReportSettingsCard lets workspace Leads configure report automation behavior.
 */
export function ReportSettingsCard(props: ReportSettingsCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [rules, setRules] = useState<readonly ReportRule[]>([]);
	const [drafts, setDrafts] = useState<ReportDraftsByID>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads report settings for the workspace.
		 */
		async function loadReportRules(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listReportRules(props.workspace.id);

				if (!isActive) {
					return;
				}

				setRules(response.reportRules);
				setDrafts(buildDrafts(response.reportRules));
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
	}, [props.workspace.id]);

	const sortedRules = useMemo(() => {
		return [...rules].sort((first, second) => {
			if (first.reportKind === second.reportKind) {
				return first.scheduleId.localeCompare(second.scheduleId);
			}

			return first.reportKind.localeCompare(second.reportKind);
		});
	}, [rules]);

	const enabledCount = useMemo(() => rules.filter(rule => rule.enabled).length, [rules]);
	const postToChannelCount = useMemo(() => rules.filter(rule => rule.postToChannel).length, [rules]);
	const previewRequiredCount = useMemo(() => rules.filter(rule => rule.previewRequired).length, [rules]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Updates one report draft.
	 */
	function updateDraft(ruleID: string, patch: Partial<ReportRuleDraft>): void {
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
	 * Saves one report rule.
	 */
	async function handleSave(rule: ReportRule): Promise<void> {
		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage report settings.');
			setLoadState('error');
			return;
		}

		const draft = drafts[rule.id];
		if (draft === undefined) {
			setMessage('Could not find report settings to save.');
			setLoadState('error');
			return;
		}

		setLoadState('saving');
		setSavingRuleID(rule.id);
		setMessage('');

		try {
			const response = await updateReportRule(props.workspace.id, rule.id, {
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
			setLoadState('ready');
			setSavingRuleID('');
			setMessage('Report settings updated.');
			toast.success('Report settings updated');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingRuleID('');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Report rules"
				title="Report settings"
				description="Configure whether scheduled reports post automatically, require preview, and include missing, leave, blockers, and time sections."
				icon={Settings2}
				action={<CampfireStatusPill tone="green">{enabledCount} enabled</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Rules" value={String(rules.length)} helper="Configured" icon={FileText} />
					<CampfireMetric label="Enabled" value={String(enabledCount)} helper="Active rules" />
					<CampfireMetric label="Auto-post" value={String(postToChannelCount)} helper="Post to channel" />
					<CampfireMetric
						label="Preview required"
						value={String(previewRequiredCount)}
						helper="Manual review"
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading report settings…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view report settings, but you cannot edit them." />
				)}

				{sortedRules.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={FileText}
						title="No report rules"
						description="Default report rules are created when default standup templates and schedules are seeded."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{sortedRules.map(rule => (
						<ReportRuleCard
							key={rule.id}
							rule={rule}
							draft={drafts[rule.id] ?? reportRuleToDraft(rule)}
							disabled={isBusy || !props.canManageWorkspace}
							saving={savingRuleID === rule.id}
							onChange={patch => updateDraft(rule.id, patch)}
							onSave={() => void handleSave(rule)}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * ReportRuleCard renders one editable report rule.
 */
function ReportRuleCard(props: {
	readonly rule: ReportRule;
	readonly draft: ReportRuleDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<ReportRuleDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:xl:flex-row cf:xl:items-start cf:xl:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-xl cf:font-black cf:tracking-tight cf:text-white">
							{formatLabel(props.rule.reportKind)}
						</strong>
						<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
							{props.draft.enabled ? 'Enabled' : 'Disabled'}
						</CampfireStatusPill>
						<CampfireStatusPill tone={props.draft.postToChannel ? 'ember' : 'slate'}>
							{props.draft.postToChannel ? 'Posts to channel' : 'Manual only'}
						</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-medium cf:text-slate-400">
						Schedule {props.rule.scheduleId}
					</p>
				</div>

				<Button type="button" disabled={props.disabled} onClick={props.onSave}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save rule
				</Button>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<div className="cf:grid cf:gap-4">
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_1fr]">
					<FormField label="Sort mode" htmlFor={`campfire-report-sort-${props.rule.id}`}>
						<select
							id={`campfire-report-sort-${props.rule.id}`}
							className={selectClassName()}
							disabled={props.disabled}
							value={props.draft.sortMode}
							onChange={event =>
								props.onChange({ sortMode: toReportSortMode(event.currentTarget.value) })
							}
						>
							{reportSortOptions.map(sortMode => (
								<option key={sortMode} value={sortMode}>
									{formatLabel(sortMode)}
								</option>
							))}
						</select>
					</FormField>

					<div className="cf:grid cf:gap-3 cf:sm:grid-cols-2">
						<BooleanOption
							title="Enabled"
							description="Allow this rule to run."
							checked={props.draft.enabled}
							disabled={props.disabled}
							onChange={checked => props.onChange({ enabled: checked })}
						/>

						<BooleanOption
							title="Post to channel"
							description="Post generated report to Mattermost."
							checked={props.draft.postToChannel}
							disabled={props.disabled}
							onChange={checked => props.onChange({ postToChannel: checked })}
						/>
					</div>
				</div>

				<div className="cf:grid cf:gap-3 cf:lg:grid-cols-2">
					<BooleanOption
						title="Preview required"
						description="Require manual preview before posting."
						checked={props.draft.previewRequired}
						disabled={props.disabled}
						onChange={checked => props.onChange({ previewRequired: checked })}
					/>

					<BooleanOption
						title="Include on-leave users"
						description="Show approved-leave users in report sections."
						checked={props.draft.includeOnLeave}
						disabled={props.disabled}
						onChange={checked => props.onChange({ includeOnLeave: checked })}
					/>

					<BooleanOption
						title="Include missing users"
						description="Show missing/late standup users."
						checked={props.draft.includeMissing}
						disabled={props.disabled}
						onChange={checked => props.onChange({ includeMissing: checked })}
					/>

					<BooleanOption
						title="Include blockers"
						description="Include blocker-oriented sections."
						checked={props.draft.includeBlockers}
						disabled={props.disabled}
						onChange={checked => props.onChange({ includeBlockers: checked })}
					/>

					<BooleanOption
						title="Include time"
						description="Include task/time report data."
						checked={props.draft.includeTime}
						disabled={props.disabled}
						onChange={checked => props.onChange({ includeTime: checked })}
					/>
				</div>
			</div>
		</article>
	);
}

/**
 * BooleanOption renders one checkbox setting.
 */
function BooleanOption(props: {
	readonly title: string;
	readonly description: string;
	readonly checked: boolean;
	readonly disabled: boolean;
	readonly onChange: (checked: boolean) => void;
}): ReactElement {
	return (
		<label className="cf:flex cf:cursor-pointer cf:items-start cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<Checkbox
				className="cf:mt-0.5"
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={checked => props.onChange(checked === true)}
			/>
			<span>
				<span className="cf:block cf:text-sm cf:font-black cf:text-white">{props.title}</span>
				<span className="cf:mt-1 cf:block cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
					{props.description}
				</span>
			</span>
		</label>
	);
}

/**
 * FormField renders a labeled field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}

/**
 * MessageRow renders load/save feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * buildDrafts maps report rules into editable drafts.
 */
function buildDrafts(rules: readonly ReportRule[]): ReportDraftsByID {
	const drafts: ReportDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reportRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reportRuleToDraft maps a report rule into editable state.
 */
function reportRuleToDraft(rule: ReportRule): ReportRuleDraft {
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
 * replaceReportRule replaces one report rule in a readonly list.
 */
function replaceReportRule(rules: readonly ReportRule[], updatedRule: ReportRule): readonly ReportRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * isReportSortMode narrows unknown values to report sort modes.
 */
function isReportSortMode(value: unknown): value is ReportSortMode {
	return (
		value === 'name' ||
		value === 'first_submitted' ||
		value === 'last_submitted' ||
		value === 'missing_first' ||
		value === 'blockers_first'
	);
}

/**
 * toReportSortMode normalizes select values.
 */
function toReportSortMode(value: string): ReportSortMode {
	return isReportSortMode(value) ? value : 'first_submitted';
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
}

/**
 * formatLabel converts enum-like values to labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update report settings.';
}
