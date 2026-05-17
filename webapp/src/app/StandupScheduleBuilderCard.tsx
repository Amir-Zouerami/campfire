import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { ApiClientError, createStandupSchedule, listStandupConfiguration, updateStandupSchedule } from '../api/client';
import type { StandupSchedule, StandupTemplate, Workspace } from '../types/domain';

/**
 * StandupScheduleBuilderCardProps contains workspace and permission data.
 */
type StandupScheduleBuilderCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly onConfigurationChanged: () => void;
};

/**
 * LoadState describes the schedule-builder loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ScheduleDraft contains editable schedule fields.
 */
type ScheduleDraft = {
	readonly templateId: string;
	readonly kind: string;
	readonly enabled: boolean;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: string;
	readonly skipDailyWhenWeeklyRuns: boolean;
};

const standupKinds = ['daily', 'weekly', 'custom'] as const;
const weeklyModes = ['none', 'last_working_day'] as const;

/**
 * StandupScheduleBuilderCard lets workspace Leads create and edit standup schedules.
 */
export function StandupScheduleBuilderCard(props: StandupScheduleBuilderCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraft>>({});
	const [newSchedule, setNewSchedule] = useState<ScheduleDraft>(emptyScheduleDraft(''));
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads templates and schedules for editing.
		 */
		async function loadConfiguration(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listStandupConfiguration(props.workspace.id);

				if (!isActive) {
					return;
				}

				const firstTemplate = response.templates[0];

				setTemplates(response.templates);
				setSchedules(response.schedules);
				setScheduleDrafts(buildScheduleDrafts(response.schedules));
				setNewSchedule(emptyScheduleDraft(firstTemplate?.id ?? ''));
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadConfiguration();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id]);

	const sortedTemplates = useMemo(() => {
		return [...templates].sort((first, second) => first.name.localeCompare(second.name));
	}, [templates]);

	const sortedSchedules = useMemo(() => {
		return [...schedules].sort((first, second) => {
			if (first.kind === second.kind) {
				return first.timeOfDay.localeCompare(second.timeOfDay);
			}

			return first.kind.localeCompare(second.kind);
		});
	}, [schedules]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Updates one schedule draft.
	 */
	function updateDraft(scheduleID: string, patch: Partial<ScheduleDraft>): void {
		setScheduleDrafts(current => {
			const existingDraft = current[scheduleID];
			if (existingDraft === undefined) {
				return current;
			}

			return {
				...current,
				[scheduleID]: normalizeScheduleDraft({
					...existingDraft,
					...patch,
				}),
			};
		});
	}

	/**
	 * Updates the new schedule draft.
	 */
	function updateNewSchedule(patch: Partial<ScheduleDraft>): void {
		setNewSchedule(current =>
			normalizeScheduleDraft({
				...current,
				...patch,
			}),
		);
	}

	/**
	 * Creates a new standup schedule.
	 */
	async function handleCreateSchedule(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		if (newSchedule.templateId.trim() === '') {
			setMessage('Choose a template before creating a schedule.');
			return;
		}

		if (newSchedule.timeOfDay.trim() === '') {
			setMessage('Schedule time is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createStandupSchedule(props.workspace.id, newSchedule);

			setSchedules(current => [...current, response.schedule]);
			setScheduleDrafts(current => ({
				...current,
				[response.schedule.id]: scheduleToDraft(response.schedule),
			}));
			setNewSchedule(emptyScheduleDraft(newSchedule.templateId));
			setLoadState('ready');
			setMessage('Standup schedule created.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Saves one existing standup schedule.
	 */
	async function handleUpdateSchedule(schedule: StandupSchedule): Promise<void> {
		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		const draft = scheduleDrafts[schedule.id];
		if (draft === undefined) {
			setMessage('Could not find schedule draft.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateStandupSchedule(props.workspace.id, schedule.id, draft);

			setSchedules(current => replaceSchedule(current, response.schedule));
			setScheduleDrafts(current => ({
				...current,
				[response.schedule.id]: scheduleToDraft(response.schedule),
			}));
			setLoadState('ready');
			setMessage('Standup schedule updated.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-orange-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-orange-200">
						Schedules
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Standup schedules
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Create daily, weekly, or custom schedules. Weekly schedules use last working day mode. Daily
						schedules are not skipped by weekly schedules unless you explicitly enable that option.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-orange-300/25 cf:bg-orange-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-orange-200">
					{schedules.length} schedules
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view schedules, but only workspace Leads and system admins can change them.
				</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<form
				className="cf:mt-5 cf:grid cf:gap-3 cf:xl:grid-cols-[1.5fr_150px_140px_1fr_auto]"
				onSubmit={event => void handleCreateSchedule(event)}
			>
				<TemplateSelect
					disabled={isBusy || !props.canManageWorkspace}
					templates={sortedTemplates}
					value={newSchedule.templateId}
					onChange={templateId => updateNewSchedule({ templateId })}
				/>
				<KindSelect
					disabled={isBusy || !props.canManageWorkspace}
					value={newSchedule.kind}
					onChange={kind => updateNewSchedule({ kind })}
				/>
				<input
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
					disabled={isBusy || !props.canManageWorkspace}
					type="time"
					value={newSchedule.timeOfDay}
					onChange={event => updateNewSchedule({ timeOfDay: event.currentTarget.value })}
				/>
				<WeeklyModeSelect
					disabled={isBusy || !props.canManageWorkspace || newSchedule.kind !== 'weekly'}
					value={newSchedule.weeklyMode}
					onChange={weeklyMode => updateNewSchedule({ weeklyMode })}
				/>
				<button
					className="cf:rounded-2xl cf:border cf:border-orange-300/30 cf:bg-orange-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-orange-50 cf:transition cf:hover:bg-orange-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy || !props.canManageWorkspace || sortedTemplates.length === 0}
					type="submit"
				>
					Create schedule
				</button>

				<div className="cf:xl:col-span-5">
					<ScheduleToggles
						disabled={isBusy || !props.canManageWorkspace}
						draft={newSchedule}
						onChange={updateNewSchedule}
					/>
				</div>
			</form>

			<div className="cf:mt-5 cf:grid cf:gap-3">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading standup schedules…</p>}

				{loadState !== 'loading' && sortedSchedules.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No standup schedules yet.
					</p>
				)}

				{sortedSchedules.map(schedule => {
					const draft = scheduleDrafts[schedule.id];
					if (draft === undefined) {
						return null;
					}

					return (
						<article
							className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
							key={schedule.id}
						>
							<div className="cf:grid cf:gap-3 cf:xl:grid-cols-[1.5fr_150px_140px_1fr_auto]">
								<TemplateSelect
									disabled={isBusy || !props.canManageWorkspace}
									templates={sortedTemplates}
									value={draft.templateId}
									onChange={templateId => updateDraft(schedule.id, { templateId })}
								/>
								<KindSelect
									disabled={isBusy || !props.canManageWorkspace}
									value={draft.kind}
									onChange={kind => updateDraft(schedule.id, { kind })}
								/>
								<input
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
									disabled={isBusy || !props.canManageWorkspace}
									type="time"
									value={draft.timeOfDay}
									onChange={event =>
										updateDraft(schedule.id, { timeOfDay: event.currentTarget.value })
									}
								/>
								<WeeklyModeSelect
									disabled={isBusy || !props.canManageWorkspace || draft.kind !== 'weekly'}
									value={draft.weeklyMode}
									onChange={weeklyMode => updateDraft(schedule.id, { weeklyMode })}
								/>
								<button
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-5 cf:py-3 cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1] cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
									disabled={isBusy || !props.canManageWorkspace}
									type="button"
									onClick={() => void handleUpdateSchedule(schedule)}
								>
									Save
								</button>
							</div>

							<div className="cf:mt-3">
								<ScheduleToggles
									disabled={isBusy || !props.canManageWorkspace}
									draft={draft}
									onChange={patch => updateDraft(schedule.id, patch)}
								/>
							</div>

							<p className="cf:m-0 cf:mt-3 cf:text-xs cf:font-bold cf:text-slate-500">
								Schedule {schedule.id}
							</p>
						</article>
					);
				})}
			</div>
		</section>
	);
}

/**
 * TemplateSelect renders a typed template select.
 */
function TemplateSelect(props: {
	readonly disabled: boolean;
	readonly templates: readonly StandupTemplate[];
	readonly value: string;
	readonly onChange: (templateId: string) => void;
}): ReactElement {
	return (
		<select
			className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
			disabled={props.disabled}
			value={props.value}
			onChange={event => props.onChange(event.currentTarget.value)}
		>
			<option value="">Choose template</option>
			{props.templates.map(template => (
				<option key={template.id} value={template.id}>
					{template.name}
				</option>
			))}
		</select>
	);
}

/**
 * KindSelect renders a standup kind select.
 */
function KindSelect(props: {
	readonly disabled: boolean;
	readonly value: string;
	readonly onChange: (kind: string) => void;
}): ReactElement {
	return (
		<select
			className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
			disabled={props.disabled}
			value={props.value}
			onChange={event => props.onChange(event.currentTarget.value)}
		>
			{standupKinds.map(kind => (
				<option key={kind} value={kind}>
					{formatLabel(kind)}
				</option>
			))}
		</select>
	);
}

/**
 * WeeklyModeSelect renders a weekly mode select.
 */
function WeeklyModeSelect(props: {
	readonly disabled: boolean;
	readonly value: string;
	readonly onChange: (weeklyMode: string) => void;
}): ReactElement {
	return (
		<select
			className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
			disabled={props.disabled}
			value={props.value}
			onChange={event => props.onChange(event.currentTarget.value)}
		>
			{weeklyModes.map(mode => (
				<option key={mode} value={mode}>
					{formatLabel(mode)}
				</option>
			))}
		</select>
	);
}

/**
 * ScheduleToggles renders schedule boolean settings.
 */
function ScheduleToggles(props: {
	readonly disabled: boolean;
	readonly draft: ScheduleDraft;
	readonly onChange: (patch: Partial<ScheduleDraft>) => void;
}): ReactElement {
	return (
		<div className="cf:flex cf:flex-wrap cf:gap-4 cf:text-sm cf:font-bold cf:text-slate-200">
			<label className="cf:flex cf:items-center cf:gap-2">
				<input
					checked={props.draft.enabled}
					disabled={props.disabled}
					type="checkbox"
					onChange={event => props.onChange({ enabled: event.currentTarget.checked })}
				/>
				Enabled
			</label>

			<label className="cf:flex cf:items-center cf:gap-2">
				<input
					checked={props.draft.skipNonWorkingDays}
					disabled={props.disabled}
					type="checkbox"
					onChange={event => props.onChange({ skipNonWorkingDays: event.currentTarget.checked })}
				/>
				Skip non-working days
			</label>

			<label className="cf:flex cf:items-center cf:gap-2">
				<input
					checked={props.draft.skipDailyWhenWeeklyRuns}
					disabled={props.disabled || props.draft.kind !== 'weekly'}
					type="checkbox"
					onChange={event => props.onChange({ skipDailyWhenWeeklyRuns: event.currentTarget.checked })}
				/>
				Skip daily when weekly runs
			</label>
		</div>
	);
}

/**
 * emptyScheduleDraft returns a blank schedule draft.
 */
function emptyScheduleDraft(templateId: string): ScheduleDraft {
	return {
		templateId,
		kind: 'daily',
		enabled: true,
		timeOfDay: '09:00',
		skipNonWorkingDays: true,
		weeklyMode: 'none',
		skipDailyWhenWeeklyRuns: false,
	};
}

/**
 * buildScheduleDrafts maps schedules to editable drafts.
 */
function buildScheduleDrafts(schedules: readonly StandupSchedule[]): Record<string, ScheduleDraft> {
	const drafts: Record<string, ScheduleDraft> = {};

	for (const schedule of schedules) {
		drafts[schedule.id] = scheduleToDraft(schedule);
	}

	return drafts;
}

/**
 * scheduleToDraft maps one schedule to an editable draft.
 */
function scheduleToDraft(schedule: StandupSchedule): ScheduleDraft {
	return normalizeScheduleDraft({
		templateId: schedule.templateId,
		kind: schedule.kind,
		enabled: schedule.enabled,
		timeOfDay: schedule.timeOfDay,
		skipNonWorkingDays: schedule.skipNonWorkingDays,
		weeklyMode: schedule.weeklyMode,
		skipDailyWhenWeeklyRuns: schedule.skipDailyWhenWeeklyRuns,
	});
}

/**
 * normalizeScheduleDraft keeps weekly-only settings consistent.
 */
function normalizeScheduleDraft(draft: ScheduleDraft): ScheduleDraft {
	if (draft.kind !== 'weekly') {
		return {
			...draft,
			weeklyMode: 'none',
			skipDailyWhenWeeklyRuns: false,
		};
	}

	if (draft.weeklyMode === 'none') {
		return {
			...draft,
			weeklyMode: 'last_working_day',
		};
	}

	return draft;
}

/**
 * replaceSchedule replaces one schedule in a readonly list.
 */
function replaceSchedule(
	schedules: readonly StandupSchedule[],
	updatedSchedule: StandupSchedule,
): readonly StandupSchedule[] {
	return schedules.map(schedule => (schedule.id === updatedSchedule.id ? updatedSchedule : schedule));
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

	return 'Could not update standup schedules.';
}
