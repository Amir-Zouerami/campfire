import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { ApiClientError, listReminderRules, updateReminderRule } from '../api/client';
import type { ReminderRule, Workspace } from '../types/domain';

/**
 * ReminderSettingsCardProps contains workspace reminder settings data.
 */
type ReminderSettingsCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
};

/**
 * LoadState describes the reminder settings panel state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ReminderRuleDraft contains editable reminder fields for one rule.
 */
type ReminderRuleDraft = {
	readonly enabled: boolean;
	readonly channelReminderEnabled: boolean;
	readonly dmReminderEnabled: boolean;
	readonly reminderOffsetsText: string;
	readonly mentionMissingInChannel: boolean;
};

/**
 * ReminderDraftsByID stores editable reminder drafts by reminder rule ID.
 */
type ReminderDraftsByID = Record<string, ReminderRuleDraft>;

/**
 * ReminderSettingsCard lets workspace Leads configure DM and channel reminder behavior.
 */
export function ReminderSettingsCard(props: ReminderSettingsCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [rules, setRules] = useState<readonly ReminderRule[]>([]);
	const [drafts, setDrafts] = useState<ReminderDraftsByID>({});
	const [savingRuleID, setSavingRuleID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads reminder settings for the workspace.
		 */
		async function loadReminderRules(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listReminderRules(props.workspace.id);

				if (!isActive) {
					return;
				}

				setRules(response.reminderRules);
				setDrafts(buildDrafts(response.reminderRules));
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
	}, [props.workspace.id]);

	const sortedRules = useMemo(() => {
		return [...rules].sort((first, second) => first.scheduleId.localeCompare(second.scheduleId));
	}, [rules]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Updates one reminder draft.
	 */
	function updateDraft(ruleID: string, patch: Partial<ReminderRuleDraft>): void {
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
	 * Saves one reminder rule.
	 */
	async function handleSave(rule: ReminderRule): Promise<void> {
		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage reminder settings.');
			return;
		}

		const draft = drafts[rule.id];
		if (draft === undefined) {
			setMessage('Could not find reminder settings to save.');
			return;
		}

		const offsets = parseReminderOffsets(draft.reminderOffsetsText);
		if (offsets.length === 0) {
			setMessage('Enter at least one reminder offset, such as 0, 30, 45, 55.');
			return;
		}

		setLoadState('saving');
		setSavingRuleID(rule.id);
		setMessage('');

		try {
			const response = await updateReminderRule(props.workspace.id, rule.id, {
				enabled: draft.enabled,
				channelReminderEnabled: draft.channelReminderEnabled,
				dmReminderEnabled: draft.dmReminderEnabled,
				reminderOffsets: offsets,
				mentionMissingInChannel: draft.mentionMissingInChannel,
			});

			setRules(current => replaceReminderRule(current, response.reminderRule));
			setDrafts(current => ({
				...current,
				[response.reminderRule.id]: reminderRuleToDraft(response.reminderRule),
			}));
			setLoadState('ready');
			setSavingRuleID('');
			setMessage('Reminder settings updated.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
			setSavingRuleID('');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-violet-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-violet-200">
						Reminders
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Reminder settings
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Configure reminder offsets from each standup schedule time. Example: 0, 30, 45, 55 means at
						schedule time, then 30, 45, and 55 minutes later.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-violet-300/25 cf:bg-violet-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-violet-200">
					{rules.length} rules
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view reminder settings, but only workspace Leads and system admins can change them.
				</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading reminder settings…</p>}

				{loadState !== 'loading' && sortedRules.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No reminder rules have been created for this workspace yet.
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
										Schedule {rule.scheduleId}
									</strong>
									<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">Rule {rule.id}</p>
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
										Enable this reminder rule
									</label>

									<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.dmReminderEnabled}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														dmReminderEnabled: event.currentTarget.checked,
													})
												}
											/>
											DM reminders
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.channelReminderEnabled}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														channelReminderEnabled: event.currentTarget.checked,
													})
												}
											/>
											Channel reminder
										</label>

										<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
											<input
												checked={draft.mentionMissingInChannel}
												className="cf:h-4 cf:w-4"
												disabled={isBusy || !props.canManageWorkspace}
												type="checkbox"
												onChange={event =>
													updateDraft(rule.id, {
														mentionMissingInChannel: event.currentTarget.checked,
													})
												}
											/>
											Mention missing users
										</label>
									</div>

									<div>
										<label
											className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
											htmlFor={`campfire-reminder-offsets-${rule.id}`}
										>
											Reminder offsets in minutes
										</label>
										<input
											className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:placeholder:text-slate-500 cf:focus:border-violet-300/45"
											disabled={isBusy || !props.canManageWorkspace}
											id={`campfire-reminder-offsets-${rule.id}`}
											placeholder="0, 30, 45, 55"
											type="text"
											value={draft.reminderOffsetsText}
											onChange={event =>
												updateDraft(rule.id, { reminderOffsetsText: event.currentTarget.value })
											}
										/>
									</div>

									{props.canManageWorkspace && (
										<div>
											<button
												className="cf:rounded-2xl cf:border cf:border-violet-300/30 cf:bg-violet-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-violet-50 cf:transition cf:hover:bg-violet-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
												disabled={saveDisabled}
												type="button"
												onClick={() => void handleSave(rule)}
											>
												{isSavingThisRule ? 'Saving…' : 'Save reminder rule'}
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
 * buildDrafts maps reminder rules to editable drafts.
 */
function buildDrafts(rules: readonly ReminderRule[]): ReminderDraftsByID {
	const drafts: ReminderDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reminderRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reminderRuleToDraft maps one reminder rule to editable form state.
 */
function reminderRuleToDraft(rule: ReminderRule): ReminderRuleDraft {
	return {
		enabled: rule.enabled,
		channelReminderEnabled: rule.channelReminderEnabled,
		dmReminderEnabled: rule.dmReminderEnabled,
		reminderOffsetsText: rule.reminderOffsets.join(', '),
		mentionMissingInChannel: rule.mentionMissingInChannel,
	};
}

/**
 * parseReminderOffsets converts comma-separated offset text into minute values.
 */
function parseReminderOffsets(value: string): readonly number[] {
	const offsets = value
		.split(',')
		.map(part => Number.parseInt(part.trim(), 10))
		.filter(offset => Number.isInteger(offset) && offset >= 0 && offset <= 1440);

	return [...new Set(offsets)].sort((first, second) => first - second);
}

/**
 * replaceReminderRule replaces a reminder rule in a readonly list.
 */
function replaceReminderRule(rules: readonly ReminderRule[], updatedRule: ReminderRule): readonly ReminderRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * statusClassName returns classes for reminder enabled state.
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
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update reminder settings.';
}
