import { useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { ApiClientError, createWorkspace } from '../api/client';
import type { Workspace } from '../types/domain';

/**
 * WorkspaceSetupCardProps contains Mattermost context needed to create a workspace.
 */
type WorkspaceSetupCardProps = {
	readonly channelID: string;
	readonly channelName: string | null;
	readonly teamID: string;
	readonly onWorkspaceCreated: (workspace: Workspace) => void;
};

/**
 * WorkspaceSetupFormState contains controlled setup form values.
 */
type WorkspaceSetupFormState = {
	readonly name: string;
	readonly description: string;
	readonly boardURL: string;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly channelAdminsAreLeads: boolean;
	readonly createDefaultTemplates: boolean;
};

/**
 * SaveState describes workspace setup submit state.
 */
type SaveState = 'idle' | 'saving' | 'error' | 'created';

const defaultWorkingDays = [1, 2, 3, 4, 5] as const;

/**
 * WorkspaceSetupCard creates a Campfire workspace for the current channel.
 */
export function WorkspaceSetupCard(props: WorkspaceSetupCardProps): ReactElement {
	const defaultName = useMemo(() => buildDefaultWorkspaceName(props.channelName), [props.channelName]);
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [message, setMessage] = useState('');
	const [form, setForm] = useState<WorkspaceSetupFormState>({
		name: defaultName,
		description: '',
		boardURL: '',
		timezone: getBrowserTimezone(),
		workingDays: defaultWorkingDays,
		channelAdminsAreLeads: true,
		createDefaultTemplates: true,
	});

	/**
	 * Creates the workspace.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (form.name.trim() === '') {
			setMessage('Workspace name is required.');
			return;
		}

		if (form.timezone.trim() === '') {
			setMessage('Timezone is required.');
			return;
		}

		if (form.workingDays.length === 0) {
			setMessage('Choose at least one working day.');
			return;
		}

		setSaveState('saving');
		setMessage('');

		try {
			const response = await createWorkspace({
				teamId: props.teamID,
				channelId: props.channelID,
				name: form.name.trim(),
				description: form.description.trim(),
				boardUrl: form.boardURL.trim(),
				timezone: form.timezone.trim(),
				workingDays: [...form.workingDays],
				channelAdminsAreLeads: form.channelAdminsAreLeads,
				namedLeadUserIds: [],
				namedApproverUserIds: [],
				createDefaultTemplates: form.createDefaultTemplates,
			});

			setSaveState('created');
			setMessage('Workspace created. Loading Campfire workspace…');
			props.onWorkspaceCreated(response.workspace);
		} catch (error: unknown) {
			setSaveState('error');
			setMessage(errorToMessage(error));
		}
	}

	const isBusy = saveState === 'saving';

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-orange-400/20 cf:bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_34%)] cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
						Workspace setup
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Turn this channel into a Campfire workspace
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Campfire will seed leave types, daily and weekly standup templates, reminder windows, and report
						rules for this Mattermost channel.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-amber-300/25 cf:bg-amber-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-amber-300">
					New workspace
				</div>
			</div>

			<form className="cf:mt-6 cf:grid cf:gap-4" onSubmit={handleSubmit}>
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
					<Field label="Workspace name">
						<input
							className={inputClassName}
							type="text"
							value={form.name}
							disabled={isBusy}
							onChange={event => updateForm(setForm, { name: event.currentTarget.value })}
						/>
					</Field>

					<Field label="Timezone">
						<input
							className={inputClassName}
							type="text"
							value={form.timezone}
							disabled={isBusy}
							placeholder="Europe/Berlin"
							onChange={event => updateForm(setForm, { timezone: event.currentTarget.value })}
						/>
					</Field>
				</div>

				<Field label="Description">
					<textarea
						className={`${inputClassName} cf:min-h-24 cf:resize-y`}
						value={form.description}
						disabled={isBusy}
						placeholder="Optional description for this workspace..."
						onChange={event => updateForm(setForm, { description: event.currentTarget.value })}
					/>
				</Field>

				<Field label="Board URL">
					<input
						className={inputClassName}
						type="url"
						value={form.boardURL}
						disabled={isBusy}
						placeholder="Optional Jira, Linear, GitHub Projects, or board URL..."
						onChange={event => updateForm(setForm, { boardURL: event.currentTarget.value })}
					/>
				</Field>

				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-amber-300">
						Working days
					</p>
					<div className="cf:mt-2 cf:flex cf:flex-wrap cf:gap-2">
						{weekdayOptions.map(weekday => (
							<button
								className={workingDayButtonClassName(form.workingDays.includes(weekday.value))}
								type="button"
								key={weekday.value}
								disabled={isBusy}
								onClick={() => toggleWorkingDay(setForm, weekday.value)}
							>
								{weekday.label}
							</button>
						))}
					</div>
				</div>

				<div className="cf:grid cf:gap-3 cf:lg:grid-cols-2">
					<CheckboxField
						label="Treat channel admins as leads"
						checked={form.channelAdminsAreLeads}
						disabled={isBusy}
						onChange={checked => updateForm(setForm, { channelAdminsAreLeads: checked })}
					/>

					<CheckboxField
						label="Create default standup templates and schedules"
						checked={form.createDefaultTemplates}
						disabled={isBusy}
						onChange={checked => updateForm(setForm, { createDefaultTemplates: checked })}
					/>
				</div>

				<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-center">
					<button
						className="cf:w-fit cf:rounded-2xl cf:border cf:border-orange-300/25 cf:bg-gradient-to-br cf:from-orange-500 cf:to-amber-300 cf:px-5 cf:py-3 cf:font-black cf:text-slate-950 cf:shadow-[0_18px_50px_rgba(249,115,22,0.18)] cf:transition cf:hover:brightness-110 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						type="submit"
						disabled={isBusy}
					>
						Create workspace
					</button>

					{message !== '' && <p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
				</div>
			</form>
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-orange-400/60 cf:focus:ring-4 cf:focus:ring-orange-400/15 cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

const weekdayOptions = [
	{ label: 'Sun', value: 0 },
	{ label: 'Mon', value: 1 },
	{ label: 'Tue', value: 2 },
	{ label: 'Wed', value: 3 },
	{ label: 'Thu', value: 4 },
	{ label: 'Fri', value: 5 },
	{ label: 'Sat', value: 6 },
] as const;

/**
 * Field renders a labeled setup form control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-amber-300">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * CheckboxField renders a polished boolean field.
 */
function CheckboxField(props: {
	readonly label: string;
	readonly checked: boolean;
	readonly disabled: boolean;
	readonly onChange: (checked: boolean) => void;
}): ReactElement {
	return (
		<label className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<input
				className="cf:size-4 cf:accent-orange-500"
				type="checkbox"
				checked={props.checked}
				disabled={props.disabled}
				onChange={event => props.onChange(event.currentTarget.checked)}
			/>
			<span className="cf:text-sm cf:font-bold cf:text-slate-100">{props.label}</span>
		</label>
	);
}

/**
 * updateForm merges partial form changes.
 */
function updateForm(
	setForm: (updater: (current: WorkspaceSetupFormState) => WorkspaceSetupFormState) => void,
	patch: Partial<WorkspaceSetupFormState>,
): void {
	setForm(current => ({
		...current,
		...patch,
	}));
}

/**
 * toggleWorkingDay toggles one weekday in the setup form.
 */
function toggleWorkingDay(
	setForm: (updater: (current: WorkspaceSetupFormState) => WorkspaceSetupFormState) => void,
	weekday: number,
): void {
	setForm(current => {
		const exists = current.workingDays.includes(weekday);
		const workingDays = exists
			? current.workingDays.filter(value => value !== weekday)
			: [...current.workingDays, weekday].sort((first, second) => first - second);

		return {
			...current,
			workingDays,
		};
	});
}

/**
 * workingDayButtonClassName returns the selected/unselected weekday button style.
 */
function workingDayButtonClassName(selected: boolean): string {
	const baseClassName =
		'cf:rounded-2xl cf:border cf:px-4 cf:py-2 cf:text-sm cf:font-black cf:transition cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

	if (selected) {
		return `${baseClassName} cf:border-orange-300/35 cf:bg-orange-400/20 cf:text-orange-100`;
	}

	return `${baseClassName} cf:border-white/10 cf:bg-white/5 cf:text-slate-300 cf:hover:bg-white/10`;
}

/**
 * buildDefaultWorkspaceName creates a friendly workspace name from the channel.
 */
function buildDefaultWorkspaceName(channelName: string | null): string {
	if (channelName !== null && channelName.trim() !== '') {
		return channelName.trim();
	}

	return 'Campfire Workspace';
}

/**
 * getBrowserTimezone returns the browser IANA timezone or UTC.
 */
function getBrowserTimezone(): string {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return timezone.trim() !== '' ? timezone : 'UTC';
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

	return 'Could not create workspace.';
}
