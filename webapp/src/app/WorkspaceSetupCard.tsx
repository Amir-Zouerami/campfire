import { useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarDays, Check, Flame, Hash, Loader2, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ApiClientError, createWorkspace } from '@/api';
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

import { CampfireCardBody, CampfireCardHeader, CampfirePanel, CampfireStatusPill } from './campfire-ui';

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
		name: defaultName,
		description: '',
		boardURL: '',
		timezone: getBrowserTimezone(),
		workingDays: defaultWorkingDays,
		channelAdminsAreLeads: true,
		createDefaultTemplates: true,
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (form.name.trim() === '') {
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
		<form onSubmit={handleSubmit}>
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Workspace setup"
					title="Turn this channel into a Campfire workspace"
					description="Connect this Mattermost channel to standups, tasks, time, leave planning, reminders, and reports."
					icon={Flame}
					action={<CampfireStatusPill tone="ember">New workspace</CampfireStatusPill>}
				/>

				<CampfireCardBody className="cf:grid cf:gap-7">
					<div className="campfire-summary-grid">
						<ContextTile
							label="Channel"
							value={props.channelName ?? 'Current channel'}
							helper={props.channelID}
							icon={Hash}
						/>
						<ContextTile
							label="Working days"
							value={`${form.workingDays.length} selected`}
							helper={workingDaysLabel(form.workingDays)}
							icon={CalendarDays}
						/>
						<ContextTile
							label="Defaults"
							value={form.createDefaultTemplates ? 'Seeded setup' : 'Empty setup'}
							helper="Templates, schedules, rules"
							icon={ShieldCheck}
						/>
					</div>

					<div className="campfire-form-section">
						<div className="campfire-section-heading-row">
							<div>
								<h3 className="campfire-section-title">Workspace identity</h3>
								<p className="campfire-section-description">
									These values can be cleaned up later in workspace settings.
								</p>
							</div>

							<CampfireStatusPill>Team {props.teamID.slice(0, 7)}</CampfireStatusPill>
						</div>

						<div className="cf:grid cf:gap-6 cf:md:grid-cols-2">
							<div className="cf:grid cf:gap-3">
								<Label htmlFor="campfire-workspace-name" className="campfire-field-label">
									Workspace name
								</Label>
								<Input
									id="campfire-workspace-name"
									value={form.name}
									onChange={event => updateForm({ name: event.currentTarget.value })}
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
								value={form.boardURL}
								placeholder="Optional board, Jira, Linear, GitHub project, or task source URL"
								onChange={event => updateForm({ boardURL: event.currentTarget.value })}
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
								value={form.description}
								placeholder="Optional workspace note…"
								onChange={event => updateForm({ description: event.currentTarget.value })}
								disabled={isBusy}
								className="campfire-textarea"
							/>
						</div>
					</div>

					<div className="campfire-form-section">
						<div className="campfire-section-heading-row">
							<div>
								<h3 className="campfire-section-title">Working calendar</h3>
								<p className="campfire-section-description">
									Standups can skip non-working days when schedules are configured to do so.
								</p>
							</div>

							<CampfireStatusPill tone="green">{workingDaysLabel(form.workingDays)}</CampfireStatusPill>
						</div>

						<div className="cf:grid cf:grid-cols-2 cf:gap-3 cf:sm:grid-cols-4 cf:lg:grid-cols-7">
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
										<span className="cf:block cf:text-lg cf:font-bold">{option.shortLabel}</span>
										<span className="cf:mt-1.5 cf:block cf:text-sm cf:font-bold cf:uppercase cf:tracking-widest">
											{option.label}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="campfire-form-section">
						<div>
							<h3 className="campfire-section-title">Startup behavior</h3>
							<p className="campfire-section-description">
								These defaults make the workspace usable immediately after creation.
							</p>
						</div>

						<div className="cf:grid cf:gap-5 cf:md:grid-cols-2">
							<label className="campfire-check-card">
								<Checkbox
									checked={form.channelAdminsAreLeads}
									onCheckedChange={checked => updateForm({ channelAdminsAreLeads: checked === true })}
									disabled={isBusy}
									className="campfire-check-box"
								/>
								<span>
									<span className="campfire-check-title">Treat channel admins as Leads</span>
									<span className="campfire-check-description">
										Channel admins can manage Campfire settings, templates, schedules, reminders,
										reports, and workspace calendar rules.
									</span>
								</span>
							</label>

							<label className="campfire-check-card">
								<Checkbox
									checked={form.createDefaultTemplates}
									onCheckedChange={checked =>
										updateForm({ createDefaultTemplates: checked === true })
									}
									disabled={isBusy}
									className="campfire-check-box"
								/>
								<span>
									<span className="campfire-check-title">
										Create default standup templates and schedules
									</span>
									<span className="campfire-check-description">
										Seeds daily and weekly standup templates, reminder rules, report rules, working
										days, and leave defaults.
									</span>
								</span>
							</label>
						</div>
					</div>

					<div className="campfire-submit-row">
						<div>
							<p className="campfire-submit-title">Ready to light the fire?</p>
							<p className="campfire-submit-description">
								This creates the Campfire workspace for the current Mattermost channel.
							</p>
						</div>

						<button type="submit" disabled={isBusy} className="campfire-submit-button">
							{isBusy ? (
								<Loader2 className="cf:size-5 cf:animate-spin" />
							) : (
								<Check className="cf:size-5" />
							)}
							<span>Create workspace</span>
						</button>
					</div>

					{message !== '' && <div className={messageClassName(saveState)}>{message}</div>}
				</CampfireCardBody>
			</CampfirePanel>
		</form>
	);
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
 * ContextTile renders a small setup summary tile.
 */
function ContextTile(props: {
	readonly label: string;
	readonly value: string;
	readonly helper: string;
	readonly icon: LucideIcon;
}): ReactElement {
	const Icon = props.icon;

	return (
		<div className="campfire-summary-tile">
			<div className="campfire-summary-icon">
				<Icon className="cf:size-9" />
			</div>

			<div className="campfire-summary-copy">
				<p className="campfire-summary-label">{props.label}</p>
				<p className="campfire-summary-value">{props.value}</p>
				<p className="campfire-summary-helper">{props.helper}</p>
			</div>
		</div>
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
 * messageClassName returns feedback styling.
 */
function messageClassName(saveState: SaveState): string {
	const baseClassName = 'cf:rounded-2xl cf:border cf:px-5 cf:py-4 cf:text-base cf:font-semibold';

	switch (saveState) {
		case 'created':
			return `${baseClassName} cf:border-emerald-400/20 cf:bg-emerald-500/10 cf:text-emerald-100`;

		case 'error':
			return `${baseClassName} cf:border-red-400/20 cf:bg-red-500/10 cf:text-red-100`;

		case 'idle':
		case 'saving':
			return `${baseClassName} cf:border-border cf:bg-card/70 cf:text-muted-foreground`;
	}
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

	return 'Could not create the Campfire workspace.';
}
