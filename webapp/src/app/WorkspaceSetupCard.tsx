import { useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarDays, Check, Hash, Info, Loader2, ShieldCheck } from 'lucide-react';

import { createWorkspace } from '@/api';
import { CampfirePageHeader, CampfireStatCard, CampfireStatusPill, CampfireSurface, CampfireWorkflowNote } from '@/components/campfire/CampfireLayoutPrimitives';
import { toast } from '@/components/campfire/campfire-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Workspace } from '@/types/domain';


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
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly channelAdminsAreLeads: boolean;
	readonly createDefaultTemplates: boolean;
};

/**
 * SaveState describes workspace setup submit state.
 */
type SaveState = 'idle' | 'saving' | 'error' | 'created';

/**
 * WeekdayOption describes one weekday toggle.
 */
type WeekdayOption = {
	readonly value: number;
	readonly shortLabel: string;
	readonly label: string;
};

/**
 * TimezoneGroup describes one grouped timezone section.
 */
type TimezoneGroup = {
	readonly label: string;
	readonly values: readonly string[];
};

/**
 * IntlWithSupportedValuesOf narrows modern Intl timezone support without using any.
 */
type IntlWithSupportedValuesOf = typeof Intl & {
	readonly supportedValuesOf?: (key: 'timeZone') => string[];
};

const defaultWorkingDays = [1, 2, 3, 4, 5] as const;

const weekdayOptions: readonly WeekdayOption[] = [
	{ value: 0, shortLabel: 'Sun', label: 'Sunday' },
	{ value: 1, shortLabel: 'Mon', label: 'Monday' },
	{ value: 2, shortLabel: 'Tue', label: 'Tuesday' },
	{ value: 3, shortLabel: 'Wed', label: 'Wednesday' },
	{ value: 4, shortLabel: 'Thu', label: 'Thursday' },
	{ value: 5, shortLabel: 'Fri', label: 'Friday' },
	{ value: 6, shortLabel: 'Sat', label: 'Saturday' },
];

const fallbackTimezoneValues = [
	'UTC',
	'Asia/Tehran',
	'Europe/Helsinki',
	'Europe/Oslo',
	'Europe/London',
	'Europe/Berlin',
	'Europe/Amsterdam',
	'Europe/Paris',
	'Asia/Dubai',
	'Asia/Istanbul',
	'Asia/Kolkata',
	'Asia/Singapore',
	'Asia/Tokyo',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
] as const;

const timezoneGroups = buildTimezoneGroups();

/**
 * WorkspaceSetupCard creates a Campfire workspace for the current channel.
 */
export function WorkspaceSetupCard(props: WorkspaceSetupCardProps): ReactElement {
	const defaultName = useMemo(() => buildDefaultWorkspaceName(props.channelName), [props.channelName]);
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [message, setMessage] = useState('');
	const [form, setForm] = useState<WorkspaceSetupFormState>({
		timezone: getBrowserTimezone(),
		workingDays: defaultWorkingDays,
		channelAdminsAreLeads: true,
		createDefaultTemplates: true,
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const name = formDataString(formData, 'workspace-name');
		const description = formDataString(formData, 'workspace-description');
		const boardURL = formDataString(formData, 'workspace-board-url');

		if (name === '') {
			setSaveState('error');
			setMessage('Workspace name is required.');
			return;
		}

		if (form.timezone.trim() === '') {
			setSaveState('error');
			setMessage('Timezone is required.');
			return;
		}

		if (form.workingDays.length === 0) {
			setSaveState('error');
			setMessage('Choose at least one working day.');
			return;
		}

		setSaveState('saving');
		setMessage('');

		try {
			const response = await createWorkspace({
				teamId: props.teamID,
				channelId: props.channelID,
				name,
				description,
				boardUrl: boardURL,
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
			setSaveState('idle');
			setMessage('');
			toast.error(error, {
				fallbackMessage: 'Could not create the Campfire workspace.',
			});
		}
	}

	function updateForm(update: Partial<WorkspaceSetupFormState>): void {
		setForm(current => ({
			...current,
			...update,
		}));
	}

	function toggleWorkingDay(weekday: number): void {
		const hasWeekday = form.workingDays.includes(weekday);
		const nextWorkingDays = hasWeekday
			? form.workingDays.filter(current => current !== weekday)
			: [...form.workingDays, weekday];

		updateForm({
			workingDays: nextWorkingDays.sort((first, second) => first - second),
		});
	}

	const isBusy = saveState === 'saving';

	return (
		<form className="campfire-setup-form" onSubmit={handleSubmit}>
			<CampfirePageHeader
				eyebrow="Workspace setup"
				title="Turn this channel into a Campfire workspace"
				description="Connect this Mattermost channel to standups, tasks, time, leave planning, reminders, and reports."
				actions={<CampfireStatusPill tone="ember">New workspace</CampfireStatusPill>}
			/>

			<div className="campfire-setup-summary-grid">
				<CampfireStatCard
					icon={Hash}
					label="Channel"
					value={props.channelName ?? 'Current channel'}
					helper={shortID(props.channelID)}
				/>
				<CampfireStatCard
					icon={CalendarDays}
					label="Working days"
					value={`${form.workingDays.length} selected`}
					helper={workingDaysLabel(form.workingDays)}
					tone="green"
				/>
				<CampfireStatCard
					icon={ShieldCheck}
					label="Defaults"
					value={form.createDefaultTemplates ? 'Seeded setup' : 'Empty setup'}
					helper="Templates, reminders, reports"
				/>
			</div>

			<CampfireWorkflowNote
				icon={Info}
				title="Startup behavior"
				description="This setup keeps local validation inline, while server and permission errors appear as bottom-right Campfire toasts."
			/>

			<div className="campfire-setup-grid">
				<CampfireSurface className="campfire-setup-primary-surface">
					<div className="campfire-section-heading-row">
						<div>
							<h3 className="campfire-section-title">Workspace identity</h3>
							<p className="campfire-section-description">
								These values can be cleaned up later in workspace settings.
							</p>
						</div>

						<CampfireStatusPill>Team {shortID(props.teamID)}</CampfireStatusPill>
					</div>

					<div className="cf:grid cf:gap-6 cf:md:grid-cols-2">
						<div className="cf:grid cf:gap-3">
							<Label htmlFor="campfire-workspace-name" className="campfire-field-label">
								Workspace name
							</Label>
							<Input
								id="campfire-workspace-name"
								name="workspace-name"
								defaultValue={defaultName}
								disabled={isBusy}
								className="campfire-input"
							/>
						</div>

						<div className="cf:grid cf:gap-3">
							<Label htmlFor="campfire-workspace-timezone" className="campfire-field-label">
								Timezone
							</Label>
							<TimezoneSelect
								id="campfire-workspace-timezone"
								value={form.timezone}
								disabled={isBusy}
								onChange={timezone => updateForm({ timezone })}
							/>
						</div>
					</div>

					<div className="cf:grid cf:gap-3">
						<Label htmlFor="campfire-workspace-board-url" className="campfire-field-label">
							Board URL
						</Label>
						<Input
							id="campfire-workspace-board-url"
							name="workspace-board-url"
							placeholder="Optional board, Jira, Linear, GitHub project, or task source URL"
							disabled={isBusy}
							className="campfire-input"
						/>
					</div>

					<div className="cf:grid cf:gap-3">
						<Label htmlFor="campfire-workspace-description" className="campfire-field-label">
							Description
						</Label>
						<Textarea
							id="campfire-workspace-description"
							name="workspace-description"
							placeholder="Optional workspace note…"
							disabled={isBusy}
							className="campfire-textarea"
						/>
					</div>
				</CampfireSurface>

				<aside className="campfire-setup-side-stack">
					<CampfireSurface>
						<div className="campfire-section-heading-row campfire-section-heading-row--compact">
							<div>
								<h3 className="campfire-section-title">Working calendar</h3>
								<p className="campfire-section-description">Choose the default rhythm for standups.</p>
							</div>

							<CampfireStatusPill tone="green">{workingDaysLabel(form.workingDays)}</CampfireStatusPill>
						</div>

						<div className="campfire-setup-weekday-grid">
							{weekdayOptions.map(option => {
								const isSelected = form.workingDays.includes(option.value);

								return (
									<button
										key={option.value}
										type="button"
										disabled={isBusy}
										className={weekdayButtonClassName(isSelected)}
										onClick={() => toggleWorkingDay(option.value)}
									>
										<span className="cf:block cf:text-sm cf:font-semibold">{option.shortLabel}</span>
										<span className="cf:mt-1 cf:block cf:text-[0.68rem] cf:font-medium cf:uppercase cf:tracking-[0.16em]">
											{option.label}
										</span>
									</button>
								);
							})}
						</div>
					</CampfireSurface>

					<CampfireSurface>
						<div className="cf:grid cf:gap-5">
							<div>
								<h3 className="campfire-section-title">Role and template defaults</h3>
								<p className="campfire-section-description">
									These defaults make the workspace usable immediately after creation.
								</p>
							</div>

							<label className="campfire-check-card campfire-check-card--flat">
								<Checkbox
									checked={form.channelAdminsAreLeads}
									onCheckedChange={checked => updateForm({ channelAdminsAreLeads: checked === true })}
									disabled={isBusy}
									className="campfire-check-box"
								/>
								<span>
									<span className="campfire-check-title">Treat channel admins as Leads</span>
									<span className="campfire-check-description">
										Channel admins can manage workspace settings, templates, schedules, reminders,
										reports, and calendar rules.
									</span>
								</span>
							</label>

							<label className="campfire-check-card campfire-check-card--flat">
								<Checkbox
									checked={form.createDefaultTemplates}
									onCheckedChange={checked => updateForm({ createDefaultTemplates: checked === true })}
									disabled={isBusy}
									className="campfire-check-box"
								/>
								<span>
									<span className="campfire-check-title">Create default templates and schedules</span>
									<span className="campfire-check-description">
										Seeds daily and weekly standup templates, reminder rules, report rules, working
										days, and leave defaults.
									</span>
								</span>
							</label>
						</div>
					</CampfireSurface>
				</aside>
			</div>

			<div className="campfire-submit-row campfire-submit-row--flat">
				<div>
					<p className="campfire-submit-title">Ready to light the fire?</p>
					<p className="campfire-submit-description">
						This creates the Campfire workspace for the current Mattermost channel.
					</p>
				</div>

				<button type="submit" disabled={isBusy} className="campfire-submit-button campfire-submit-button--flat">
					{isBusy ? <Loader2 className="cf:size-5 cf:animate-spin" /> : <Check className="cf:size-5" />}
					<span>Create workspace</span>
				</button>
			</div>

			{message !== '' && <div className={messageClassName(saveState)}>{message}</div>}
		</form>
	);
}

/**
 * formDataString reads an uncontrolled setup field on submit.
 */
function formDataString(formData: FormData, fieldName: string): string {
	const value = formData.get(fieldName);

	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
}

/**
 * TimezoneSelect renders the shadcn/Radix scrollable select for IANA timezones.
 */
function TimezoneSelect(props: {
	readonly id: string;
	readonly value: string;
	readonly disabled: boolean;
	readonly onChange: (timezone: string) => void;
}): ReactElement {
	return (
		<Select value={props.value} onValueChange={props.onChange} disabled={props.disabled}>
			<SelectTrigger id={props.id} className="cf:w-full">
				<SelectValue placeholder="Select a timezone" />
			</SelectTrigger>
			<SelectContent
				position="popper"
				side="bottom"
				align="start"
				sideOffset={8}
				className="cf:z-[10050] cf:max-h-80 cf:w-[var(--radix-select-trigger-width)] cf:min-w-[var(--radix-select-trigger-width)]"
			>
				{timezoneGroups.map(group => (
					<SelectGroup key={group.label}>
						<SelectLabel>{group.label}</SelectLabel>
						{group.values.map(timezone => (
							<SelectItem key={timezone} value={timezone} className="cf:text-base">
								{timezone}
							</SelectItem>
						))}
					</SelectGroup>
				))}
			</SelectContent>
		</Select>
	);
}

/**
 * weekdayButtonClassName returns a weekday toggle style.
 */
function weekdayButtonClassName(isSelected: boolean): string {
	const baseClassName = 'campfire-weekday-button';

	if (isSelected) {
		return `${baseClassName} campfire-weekday-button--selected`;
	}

	return baseClassName;
}

/**
 * workingDaysLabel returns a compact working-day label.
 */
function workingDaysLabel(workingDays: readonly number[]): string {
	if (workingDays.length === 0) {
		return 'None';
	}

	return weekdayOptions
		.filter(option => workingDays.includes(option.value))
		.map(option => option.shortLabel)
		.join(', ');
}

/**
 * buildDefaultWorkspaceName builds a sensible default workspace name.
 */
function buildDefaultWorkspaceName(channelName: string | null): string {
	if (channelName === null || channelName.trim() === '') {
		return 'Campfire workspace';
	}

	return `${channelName.trim()} Campfire`;
}

/**
 * getBrowserTimezone returns the browser timezone when available.
 */
function getBrowserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch (_error: unknown) {
		return 'UTC';
	}
}

/**
 * buildTimezoneGroups returns IANA timezones grouped by their first path segment.
 */
function buildTimezoneGroups(): readonly TimezoneGroup[] {
	const supportedValues = getSupportedTimezoneValues();
	const uniqueValues = [...new Set<string>([...fallbackTimezoneValues, ...supportedValues])].sort((first, second) =>
		first.localeCompare(second),
	);
	const groupsByLabel = new Map<string, string[]>();

	for (const value of uniqueValues) {
		const label = timezoneGroupLabel(value);
		const groupValues = groupsByLabel.get(label) ?? [];

		groupValues.push(value);
		groupsByLabel.set(label, groupValues);
	}

	return [...groupsByLabel.entries()]
		.sort(([first], [second]) => timezoneGroupSortValue(first) - timezoneGroupSortValue(second))
		.map(([label, values]) => ({
			label,
			values,
		}));
}

/**
 * getSupportedTimezoneValues returns runtime IANA timezone names when available.
 */
function getSupportedTimezoneValues(): readonly string[] {
	try {
		const intlWithSupportedValuesOf = Intl as IntlWithSupportedValuesOf;

		return intlWithSupportedValuesOf.supportedValuesOf?.('timeZone') ?? [];
	} catch (_error: unknown) {
		return [];
	}
}

/**
 * timezoneGroupLabel returns a readable group label for one timezone value.
 */
function timezoneGroupLabel(value: string): string {
	const region = value.split('/')[0] ?? value;

	switch (region) {
		case 'Africa':
			return 'Africa';
		case 'America':
			return 'America';
		case 'Antarctica':
			return 'Antarctica';
		case 'Arctic':
			return 'Arctic';
		case 'Asia':
			return 'Asia';
		case 'Atlantic':
			return 'Atlantic';
		case 'Australia':
			return 'Australia';
		case 'Europe':
			return 'Europe';
		case 'Indian':
			return 'Indian Ocean';
		case 'Pacific':
			return 'Pacific';
		case 'UTC':
			return 'UTC';
		default:
			return 'Other';
	}
}

/**
 * timezoneGroupSortValue returns a stable display order for timezone groups.
 */
function timezoneGroupSortValue(label: string): number {
	const order = [
		'UTC',
		'Asia',
		'Europe',
		'Africa',
		'America',
		'Atlantic',
		'Indian Ocean',
		'Australia',
		'Pacific',
		'Arctic',
		'Antarctica',
		'Other',
	];
	const index = order.indexOf(label);

	return index === -1 ? order.length : index;
}

/**
 * shortID returns a compact identifier label for setup context.
 */
function shortID(value: string): string {
	const trimmed = value.trim();

	if (trimmed.length <= 7) {
		return trimmed;
	}

	return trimmed.slice(0, 7);
}

/**
 * messageClassName returns feedback styling.
 */
function messageClassName(saveState: SaveState): string {
	const baseClassName = 'campfire-setup-message';

	switch (saveState) {
		case 'created':
			return `${baseClassName} campfire-setup-message--success`;

		case 'error':
			return `${baseClassName} campfire-setup-message--error`;

		case 'idle':
		case 'saving':
			return baseClassName;
	}
}