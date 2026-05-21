import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BellRing, CheckCircle2, Loader2, MessageSquareWarning, Save } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, listReminderRules, updateReminderRule } from '@/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ReminderRule, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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

	const enabledCount = useMemo(() => rules.filter(rule => rule.enabled).length, [rules]);
	const dmEnabledCount = useMemo(() => rules.filter(rule => rule.dmReminderEnabled).length, [rules]);
	const channelEnabledCount = useMemo(() => rules.filter(rule => rule.channelReminderEnabled).length, [rules]);
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
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage reminder settings.');
			return;
		}

		const draft = drafts[rule.id];
		if (draft === undefined) {
			setLoadState('error');
			setMessage('Could not find reminder settings to save.');
			return;
		}

		const offsets = parseReminderOffsets(draft.reminderOffsetsText);
		if (offsets.length === 0) {
			setLoadState('error');
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
			toast.success('Reminder settings updated');
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
				eyebrow="Reminders"
				title="Standup reminder rules"
				description="Configure exact reminder offsets from the schedule time, DM nudges, and channel reminders for missing users."
				icon={BellRing}
				action={<CampfireStatusPill tone="green">{enabledCount} enabled</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Rules" value={String(rules.length)} helper="Configured" />
					<CampfireMetric label="Enabled" value={String(enabledCount)} helper="Active rules" />
					<CampfireMetric label="DM reminders" value={String(dmEnabledCount)} helper="User nudges" />
					<CampfireMetric
						label="Channel reminders"
						value={String(channelEnabledCount)}
						helper="Missing users"
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading reminder settings…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view reminder settings, but you cannot edit them." />
				)}

				<div className="cf:rounded-3xl cf:border cf:border-amber-300/20 cf:bg-amber-950/20 cf:p-4">
					<div className="cf:flex cf:items-start cf:gap-3">
						<MessageSquareWarning className="cf:mt-0.5 cf:size-5 cf:text-amber-200" />
						<div>
							<p className="cf:text-sm cf:font-black cf:text-amber-100">Reminder offset model</p>
							<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
								Offsets are minutes from the schedule time. For a 09:00 schedule, offsets 0, 30, 45, 55
								mean reminders at 09:00, 09:30, 09:45, and 09:55.
							</p>
						</div>
					</div>
				</div>

				<Separator className="cf:bg-white/10" />

				{sortedRules.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={BellRing}
						title="No reminder rules"
						description="Reminder rules are created when default standup templates and schedules are seeded."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{sortedRules.map(rule => (
						<ReminderRuleCard
							key={rule.id}
							rule={rule}
							draft={drafts[rule.id] ?? reminderRuleToDraft(rule)}
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
 * ReminderRuleCard renders one editable reminder rule.
 */
function ReminderRuleCard(props: {
	readonly rule: ReminderRule;
	readonly draft: ReminderRuleDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<ReminderRuleDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	const offsets = parseReminderOffsets(props.draft.reminderOffsetsText);

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:xl:flex-row cf:xl:items-start cf:xl:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-xl cf:font-black cf:tracking-tight cf:text-white">
							Schedule {shortID(props.rule.scheduleId)}
						</strong>
						<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
							{props.draft.enabled ? 'Enabled' : 'Disabled'}
						</CampfireStatusPill>
						<CampfireStatusPill tone={props.draft.dmReminderEnabled ? 'ember' : 'slate'}>
							{props.draft.dmReminderEnabled ? 'DM on' : 'DM off'}
						</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-medium cf:text-slate-400">
						Created {formatDateTime(props.rule.createdAt)} · Updated {formatDateTime(props.rule.updatedAt)}
					</p>
				</div>

				<Button type="button" disabled={props.disabled} onClick={props.onSave}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save rule
				</Button>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<div className="cf:grid cf:gap-4">
				<div className="cf:grid cf:gap-3 cf:lg:grid-cols-2">
					<BooleanOption
						title="Enabled"
						description="Allow this rule to run."
						checked={props.draft.enabled}
						disabled={props.disabled}
						onChange={checked => props.onChange({ enabled: checked })}
					/>

					<BooleanOption
						title="DM reminders"
						description="Send direct-message reminders to users who have not submitted and are not on leave."
						checked={props.draft.dmReminderEnabled}
						disabled={props.disabled}
						onChange={checked => props.onChange({ dmReminderEnabled: checked })}
					/>

					<BooleanOption
						title="Channel missing reminder"
						description="Post a channel reminder for users still missing after the configured offsets."
						checked={props.draft.channelReminderEnabled}
						disabled={props.disabled}
						onChange={checked => props.onChange({ channelReminderEnabled: checked })}
					/>

					<BooleanOption
						title="Mention missing users"
						description="Mention missing users directly in the channel reminder."
						checked={props.draft.mentionMissingInChannel}
						disabled={props.disabled}
						onChange={checked => props.onChange({ mentionMissingInChannel: checked })}
					/>
				</div>

				<FormField label="Reminder offsets" htmlFor={`campfire-reminder-offsets-${props.rule.id}`}>
					<Input
						id={`campfire-reminder-offsets-${props.rule.id}`}
						disabled={props.disabled}
						placeholder="0, 30, 45, 55"
						value={props.draft.reminderOffsetsText}
						onChange={event => props.onChange({ reminderOffsetsText: event.currentTarget.value })}
					/>
				</FormField>

				<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
						Reminder preview
					</p>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						{offsets.length === 0 && (
							<span className="cf:text-sm cf:font-medium cf:text-slate-400">No valid offsets.</span>
						)}

						{offsets.map(offset => (
							<span
								key={offset}
								className="cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100"
							>
								+{offset} min
							</span>
						))}
					</div>
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
 * buildDrafts maps reminder rules into editable drafts.
 */
function buildDrafts(rules: readonly ReminderRule[]): ReminderDraftsByID {
	const drafts: ReminderDraftsByID = {};

	for (const rule of rules) {
		drafts[rule.id] = reminderRuleToDraft(rule);
	}

	return drafts;
}

/**
 * reminderRuleToDraft maps one reminder rule into editable state.
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
 * parseReminderOffsets parses comma/space/newline-separated minute offsets.
 */
function parseReminderOffsets(value: string): readonly number[] {
	const offsets = value
		.split(/[\s,]+/)
		.map(part => Number.parseInt(part.trim(), 10))
		.filter(offset => Number.isInteger(offset) && offset >= 0 && offset <= 1440);

	return [...new Set(offsets)].sort((first, second) => first - second);
}

/**
 * replaceReminderRule replaces one reminder rule in a readonly list.
 */
function replaceReminderRule(rules: readonly ReminderRule[], updatedRule: ReminderRule): readonly ReminderRule[] {
	return rules.map(rule => (rule.id === updatedRule.id ? updatedRule : rule));
}

/**
 * shortID returns a short readable ID label.
 */
function shortID(value: string): string {
	if (value.length <= 8) {
		return value;
	}

	return value.slice(0, 8);
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
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
