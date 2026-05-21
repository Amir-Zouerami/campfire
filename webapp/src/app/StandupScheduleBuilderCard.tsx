import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarClock, CheckCircle2, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, createStandupSchedule, listStandupConfiguration, updateStandupSchedule } from '@/api';
import type { CreateStandupScheduleRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { StandupKind, StandupSchedule, StandupTemplate, WeeklyMode, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

/**
 * StandupScheduleBuilderCardProps contains workspace and permission data.
 */
type StandupScheduleBuilderCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly onConfigurationChanged: () => void;
};

/**
 * LoadState describes schedule builder status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * ScheduleDraft contains editable schedule fields.
 */
type ScheduleDraft = {
	readonly templateId: string;
	readonly kind: StandupKind;
	readonly enabled: boolean;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: WeeklyMode | 'none' | '';
	readonly skipDailyWhenWeeklyRuns: boolean;
};

/**
 * ScheduleDraftsByID stores editable schedule drafts by schedule ID.
 */
type ScheduleDraftsByID = Record<string, ScheduleDraft>;

const standupKinds: readonly StandupKind[] = ['daily', 'weekly', 'custom'];

const weeklyModes: readonly (WeeklyMode | 'none')[] = ['none', 'last_working_day'];

/**
 * StandupScheduleBuilderCard lets workspace leads manage standup schedules.
 */
export function StandupScheduleBuilderCard(props: StandupScheduleBuilderCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleDraftsByID>({});
	const [newSchedule, setNewSchedule] = useState<ScheduleDraft>(emptyScheduleDraft());
	const [savingID, setSavingID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads templates and schedules.
		 */
		async function loadConfiguration(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listStandupConfiguration(props.workspace.id);

				if (!isActive) {
					return;
				}

				setTemplates(response.templates);
				setSchedules(response.schedules);
				setScheduleDrafts(buildScheduleDrafts(response.schedules));
				setNewSchedule(current => ({
					...current,
					templateId:
						current.templateId.trim() !== '' ? current.templateId : (response.templates[0]?.id ?? ''),
				}));
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

	const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
	const sortedSchedules = useMemo(() => sortSchedules(schedules), [schedules]);
	const enabledScheduleCount = useMemo(() => schedules.filter(schedule => schedule.enabled).length, [schedules]);
	const dailyScheduleCount = useMemo(
		() => schedules.filter(schedule => schedule.kind === 'daily').length,
		[schedules],
	);
	const weeklyScheduleCount = useMemo(
		() => schedules.filter(schedule => schedule.kind === 'weekly').length,
		[schedules],
	);
	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Creates a new schedule.
	 */
	async function handleCreateSchedule(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		const validationMessage = validateScheduleDraft(newSchedule);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID('new-schedule');
		setMessage('');

		try {
			const response = await createStandupSchedule(props.workspace.id, normalizeScheduleDraft(newSchedule));

			setSchedules(current => [...current, response.schedule]);
			setScheduleDrafts(current => ({
				...current,
				[response.schedule.id]: scheduleToDraft(response.schedule),
			}));
			setNewSchedule(current => ({
				...emptyScheduleDraft(),
				templateId: current.templateId,
			}));
			setLoadState('ready');
			setSavingID('');
			setMessage('Standup schedule created.');
			toast.success('Standup schedule created');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates an existing schedule.
	 */
	async function handleUpdateSchedule(schedule: StandupSchedule): Promise<void> {
		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		const draft = scheduleDrafts[schedule.id];
		if (draft === undefined) {
			setLoadState('error');
			setMessage('Schedule draft was not found.');
			return;
		}

		const validationMessage = validateScheduleDraft(draft);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID(schedule.id);
		setMessage('');

		try {
			const response = await updateStandupSchedule(
				props.workspace.id,
				schedule.id,
				normalizeScheduleDraft(draft),
			);

			setSchedules(current => replaceSchedule(current, response.schedule));
			setScheduleDrafts(current => ({
				...current,
				[response.schedule.id]: scheduleToDraft(response.schedule),
			}));
			setLoadState('ready');
			setSavingID('');
			setMessage('Standup schedule updated.');
			toast.success('Standup schedule updated');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates an existing schedule draft.
	 */
	function updateScheduleDraft(scheduleID: string, patch: Partial<ScheduleDraft>): void {
		setScheduleDrafts(current => {
			const draft = current[scheduleID];
			if (draft === undefined) {
				return current;
			}

			return {
				...current,
				[scheduleID]: {
					...draft,
					...patch,
				},
			};
		});
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Schedule builder"
				title="Standup schedules"
				description="Create and edit daily, weekly, and custom standup schedules. Weekly runs can suppress daily runs when configured."
				icon={CalendarClock}
				action={
					<CampfireStatusPill tone={props.canManageWorkspace ? 'green' : 'slate'}>
						{props.canManageWorkspace ? 'Editable' : 'Read only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Schedules"
						value={String(schedules.length)}
						helper={`${enabledScheduleCount} enabled`}
					/>
					<CampfireMetric label="Daily" value={String(dailyScheduleCount)} helper="Daily schedules" />
					<CampfireMetric label="Weekly" value={String(weeklyScheduleCount)} helper="Weekly schedules" />
					<CampfireMetric label="Templates" value={String(templates.length)} helper="Available forms" />
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading standup schedules…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view schedules, but you cannot edit them." />
				)}

				<CreateScheduleForm
					templates={sortedTemplates}
					draft={newSchedule}
					disabled={isBusy || !props.canManageWorkspace || sortedTemplates.length === 0}
					saving={savingID === 'new-schedule'}
					onChange={patch => setNewSchedule(current => ({ ...current, ...patch }))}
					onSubmit={handleCreateSchedule}
				/>

				<Separator className="cf:bg-white/10" />

				{sortedSchedules.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={CalendarClock}
						title="No schedules yet"
						description="Create a schedule after at least one standup template exists."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{sortedSchedules.map(schedule => (
						<ScheduleCard
							key={schedule.id}
							schedule={schedule}
							templates={sortedTemplates}
							draft={scheduleDrafts[schedule.id] ?? scheduleToDraft(schedule)}
							disabled={isBusy || !props.canManageWorkspace}
							saving={savingID === schedule.id}
							onChange={patch => updateScheduleDraft(schedule.id, patch)}
							onSave={() => void handleUpdateSchedule(schedule)}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * CreateScheduleForm renders the new-schedule form.
 */
function CreateScheduleForm(props: {
	readonly templates: readonly StandupTemplate[];
	readonly draft: ScheduleDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<ScheduleDraft>) => void;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): ReactElement {
	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
			onSubmit={props.onSubmit}
		>
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Create schedule</h3>
				<CampfireStatusPill tone="ember">New</CampfireStatusPill>
			</div>

			<ScheduleFields
				idPrefix="campfire-new-schedule"
				templates={props.templates}
				draft={props.draft}
				disabled={props.disabled}
				onChange={props.onChange}
			/>

			<Button type="submit" disabled={props.disabled}>
				{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
				Create schedule
			</Button>
		</form>
	);
}

/**
 * ScheduleCard renders one editable schedule.
 */
function ScheduleCard(props: {
	readonly schedule: StandupSchedule;
	readonly templates: readonly StandupTemplate[];
	readonly draft: ScheduleDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<ScheduleDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-xl cf:font-black cf:text-white">
							{formatLabel(props.schedule.kind)} · {props.schedule.timeOfDay}
						</strong>
						<CampfireStatusPill tone={props.schedule.enabled ? 'green' : 'slate'}>
							{props.schedule.enabled ? 'Enabled' : 'Disabled'}
						</CampfireStatusPill>
						{props.schedule.skipNonWorkingDays && (
							<CampfireStatusPill tone="ember">Skips non-working days</CampfireStatusPill>
						)}
					</div>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-500">
						Template {shortID(props.schedule.templateId)} · Updated{' '}
						{formatDateTime(props.schedule.updatedAt)}
					</p>
				</div>

				<Button type="button" disabled={props.disabled} onClick={props.onSave}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save schedule
				</Button>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<ScheduleFields
				idPrefix={`campfire-schedule-${props.schedule.id}`}
				templates={props.templates}
				draft={props.draft}
				disabled={props.disabled}
				onChange={props.onChange}
			/>
		</article>
	);
}

/**
 * ScheduleFields renders shared schedule fields.
 */
function ScheduleFields(props: {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: ScheduleDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: Partial<ScheduleDraft>) => void;
}): ReactElement {
	const isWeekly = props.draft.kind === 'weekly';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_14rem_12rem]">
				<FormField label="Template" htmlFor={`${props.idPrefix}-template`}>
					<select
						id={`${props.idPrefix}-template`}
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.templateId}
						onChange={event => props.onChange({ templateId: event.currentTarget.value })}
					>
						<option value="">Choose template</option>
						{props.templates.map(template => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</select>
				</FormField>

				<FormField label="Kind" htmlFor={`${props.idPrefix}-kind`}>
					<select
						id={`${props.idPrefix}-kind`}
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.kind}
						onChange={event => props.onChange({ kind: toStandupKind(event.currentTarget.value) })}
					>
						{standupKinds.map(kind => (
							<option key={kind} value={kind}>
								{formatLabel(kind)}
							</option>
						))}
					</select>
				</FormField>

				<FormField label="Time" htmlFor={`${props.idPrefix}-time`}>
					<Input
						id={`${props.idPrefix}-time`}
						disabled={props.disabled}
						type="time"
						value={props.draft.timeOfDay}
						onChange={event => props.onChange({ timeOfDay: event.currentTarget.value })}
					/>
				</FormField>
			</div>

			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[16rem_1fr]">
				<FormField label="Weekly mode" htmlFor={`${props.idPrefix}-weekly-mode`}>
					<select
						id={`${props.idPrefix}-weekly-mode`}
						className={selectClassName()}
						disabled={props.disabled || !isWeekly}
						value={isWeekly ? normalizeWeeklyMode(props.draft.weeklyMode) : 'none'}
						onChange={event => props.onChange({ weeklyMode: toWeeklyMode(event.currentTarget.value) })}
					>
						{weeklyModes.map(mode => (
							<option key={mode} value={mode}>
								{formatLabel(mode)}
							</option>
						))}
					</select>
				</FormField>

				<div className="cf:grid cf:gap-3 cf:lg:grid-cols-3">
					<BooleanOption
						title="Enabled"
						description="Allow this schedule to run."
						checked={props.draft.enabled}
						disabled={props.disabled}
						onChange={checked => props.onChange({ enabled: checked })}
					/>

					<BooleanOption
						title="Skip non-working days"
						description="Do not run on disabled weekdays."
						checked={props.draft.skipNonWorkingDays}
						disabled={props.disabled}
						onChange={checked => props.onChange({ skipNonWorkingDays: checked })}
					/>

					<BooleanOption
						title="Skip daily on weekly"
						description="Let weekly runs suppress the daily run."
						checked={props.draft.skipDailyWhenWeeklyRuns}
						disabled={props.disabled}
						onChange={checked => props.onChange({ skipDailyWhenWeeklyRuns: checked })}
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * BooleanOption renders one checkbox option.
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
 * MessageRow renders schedule-builder feedback.
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
 * emptyScheduleDraft returns a blank schedule draft.
 */
function emptyScheduleDraft(): ScheduleDraft {
	return {
		templateId: '',
		kind: 'daily',
		enabled: true,
		timeOfDay: '09:00',
		skipNonWorkingDays: true,
		weeklyMode: 'none',
		skipDailyWhenWeeklyRuns: true,
	};
}

/**
 * scheduleToDraft maps a schedule to editable state.
 */
function scheduleToDraft(schedule: StandupSchedule): ScheduleDraft {
	return {
		templateId: schedule.templateId,
		kind: schedule.kind,
		enabled: schedule.enabled,
		timeOfDay: schedule.timeOfDay,
		skipNonWorkingDays: schedule.skipNonWorkingDays,
		weeklyMode: schedule.weeklyMode,
		skipDailyWhenWeeklyRuns: schedule.skipDailyWhenWeeklyRuns,
	};
}

/**
 * normalizeScheduleDraft maps editable state to API request shape.
 */
function normalizeScheduleDraft(draft: ScheduleDraft): CreateStandupScheduleRequest {
	return {
		templateId: draft.templateId,
		kind: draft.kind,
		enabled: draft.enabled,
		timeOfDay: draft.timeOfDay,
		skipNonWorkingDays: draft.skipNonWorkingDays,
		weeklyMode: draft.kind === 'weekly' ? normalizeWeeklyMode(draft.weeklyMode) : 'none',
		skipDailyWhenWeeklyRuns: draft.skipDailyWhenWeeklyRuns,
	};
}

/**
 * validateScheduleDraft validates schedule state before save.
 */
function validateScheduleDraft(draft: ScheduleDraft): string | null {
	if (draft.templateId.trim() === '') {
		return 'Choose a template for this schedule.';
	}

	if (draft.timeOfDay.trim() === '') {
		return 'Choose a schedule time.';
	}

	return null;
}

/**
 * buildScheduleDrafts maps schedules to editable drafts.
 */
function buildScheduleDrafts(schedules: readonly StandupSchedule[]): ScheduleDraftsByID {
	const drafts: ScheduleDraftsByID = {};

	for (const schedule of schedules) {
		drafts[schedule.id] = scheduleToDraft(schedule);
	}

	return drafts;
}

/**
 * replaceSchedule replaces one schedule in a list.
 */
function replaceSchedule(
	schedules: readonly StandupSchedule[],
	updatedSchedule: StandupSchedule,
): readonly StandupSchedule[] {
	return schedules.map(schedule => (schedule.id === updatedSchedule.id ? updatedSchedule : schedule));
}

/**
 * sortTemplates returns templates in a stable display order.
 */
function sortTemplates(templates: readonly StandupTemplate[]): readonly StandupTemplate[] {
	return [...templates].sort((first, second) => {
		if (first.kind === second.kind) {
			return first.name.localeCompare(second.name);
		}

		return first.kind.localeCompare(second.kind);
	});
}

/**
 * sortSchedules returns schedules in kind/time order.
 */
function sortSchedules(schedules: readonly StandupSchedule[]): readonly StandupSchedule[] {
	return [...schedules].sort((first, second) => {
		if (first.kind === second.kind) {
			return first.timeOfDay.localeCompare(second.timeOfDay);
		}

		return first.kind.localeCompare(second.kind);
	});
}

/**
 * toStandupKind narrows select values to supported standup kinds.
 */
function toStandupKind(value: string): StandupKind {
	if (value === 'weekly' || value === 'custom') {
		return value;
	}

	return 'daily';
}

/**
 * toWeeklyMode narrows select values to supported weekly modes.
 */
function toWeeklyMode(value: string): WeeklyMode | 'none' {
	if (value === 'last_working_day') {
		return value;
	}

	return 'none';
}

/**
 * normalizeWeeklyMode returns an API-safe weekly mode.
 */
function normalizeWeeklyMode(value: WeeklyMode | 'none' | ''): WeeklyMode | 'none' {
	if (value === 'last_working_day') {
		return value;
	}

	return 'none';
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
 * shortID returns a compact ID label.
 */
function shortID(value: string): string {
	if (value.length <= 8) {
		return value;
	}

	return value.slice(0, 8);
}

/**
 * formatDateTime formats an API timestamp.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * formatLabel converts enum-like strings to labels.
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
