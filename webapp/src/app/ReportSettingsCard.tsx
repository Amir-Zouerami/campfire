import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { ApiClientError, listReportRules, updateReportRule } from '../api/client';
import type { ReportRule, ReportSortMode, Workspace } from '../types/domain';

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
			return;
		}

		const draft = drafts[rule.id];
		if (draft === undefined) {
			setMessage('Could not find report settings to save.');
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
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
			setSavingRuleID('');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-cyan-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-cyan-200">
						Reports
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Report settings
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Control report automation, posting behavior, preview requirements, sorting, and included
						sections for {props.workspace.name}.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-cyan-300/25 cf:bg-cyan-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-cyan-200">
					{rules.length} rules
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view report settings, but only workspace Leads and system admins can change them.
				</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading report settings…</p>}

				{loadState !== 'loading' && sortedRules.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No report rules have been created for this workspace yet.
					</p>
				)}

				{sortedRules.map(rule => {
					const draft = drafts[rule.id];
					const saveDisabled = isBusy || !props.canManageWorkspace || draft === undefined;
					const isSavingThisRule = savingRuleID === rule.id;

					return (
						<article
							className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
							key={rule.id}
						>
							<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
								<div>
									<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
										{formatReportKind(rule.reportKind)}
									</strong>
									<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
										Schedule {rule.scheduleId}
									</p>
								</div>

								<span className={statusClassName(draft?.enabled ?? rule.enabled)}>
									{(draft?.enabled ?? rule.enabled) ? 'Enabled' : 'Disabled'}
								</span>
							</div>

							{draft !== undefined && (
								<div className="cf:mt-4 cf:grid cf:gap-4">
									<label className="cf:flex cf:items-center cf:gap-3 cf:text-sm cf:font-bold cf:text-slate-200">
										<input
											checked={draft.enabled}
											className="cf:h-4 cf:w-4"
											disabled={isBusy || !props.canManageWorkspace}
											type="checkbox"
											onChange={event =>
												updateDraft(rule.id, { enabled: event.currentTarget.checked })
											}
										/>
										Enable this report rule
									</label>

									<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.postToChannel}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, { postToChannel: event.currentTarget.checked })
												}
											/>
											Post to channel
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.previewRequired}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														previewRequired: event.currentTarget.checked,
													})
												}
											/>
											Require manual preview
										</label>
									</div>

									<div>
										<label
											className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
											htmlFor={`campfire-report-sort-${rule.id}`}
										>
											Sort mode
										</label>
										<select
											className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:focus:border-cyan-300/45"
											disabled={isBusy || !props.canManageWorkspace}
											id={`campfire-report-sort-${rule.id}`}
											value={draft.sortMode}
											onChange={event =>
												updateDraft(rule.id, {
													sortMode: event.currentTarget.value as ReportSortMode,
												})
											}
										>
											{reportSortOptions.map(sortMode => (
												<option key={sortMode} value={sortMode}>
													{formatSortMode(sortMode)}
												</option>
											))}
										</select>
									</div>

									<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.includeMissing}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														includeMissing: event.currentTarget.checked,
													})
												}
											/>
											Missing
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.includeOnLeave}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														includeOnLeave: event.currentTarget.checked,
													})
												}
											/>
											On leave
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.includeBlockers}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														includeBlockers: event.currentTarget.checked,
													})
												}
											/>
											Blockers
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.includeTime}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, { includeTime: event.currentTarget.checked })
												}
											/>
											Time
										</label>
									</div>

									{props.canManageWorkspace && (
										<div>
											<button
												className="cf:rounded-2xl cf:border cf:border-cyan-300/30 cf:bg-cyan-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-cyan-50 cf:transition cf:hover:bg-cyan-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
												disabled={saveDisabled}
												type="button"
												onClick={() => void handleSave(rule)}
											>
												{isSavingThisRule ? 'Saving…' : 'Save report rule'}
											</button>
										</div>
									)}
								</div>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
}

/**
 * buildDrafts maps report rules to editable drafts.
 */
function buildDrafts(rules: readonly ReportRule[]): ReportDraftsByID {
	const drafts: ReportDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reportRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reportRuleToDraft maps one report rule to editable form state.
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
 * replaceReportRule replaces a report rule in a readonly list.
 */
function replaceReportRule(rules: readonly ReportRule[], updatedRule: ReportRule): readonly ReportRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * statusClassName returns classes for report enabled state.
 */
function statusClassName(enabled: boolean): string {
	const baseClassName =
		'cf:w-fit cf:rounded-full cf:border cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em]';

	if (enabled) {
		return `${baseClassName} cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:text-emerald-200`;
	}

	return `${baseClassName} cf:border-slate-300/20 cf:bg-white/[0.04] cf:text-slate-300`;
}

/**
 * formatReportKind returns a human-friendly report kind label.
 */
function formatReportKind(reportKind: string): string {
	return reportKind
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * formatSortMode returns a human-friendly sort mode label.
 */
function formatSortMode(sortMode: string): string {
	return sortMode
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
