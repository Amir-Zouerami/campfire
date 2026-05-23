import type { ReactElement } from 'react';
import { Save, Timer } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CampfireStatusPill } from '@/app/campfire-ui';

import {
	formatDateTime,
	parseReminderOffsets,
	reminderRuleCardClassName,
	reminderRuleHasChanges,
	shortID,
} from './reminders.helpers';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';

import type { ReminderRule } from '@/types/domain';
import type { ReminderRuleDraft, ReminderRuleDraftPatch } from './reminders.types';

/**
 * ReminderRuleCardProps contains one reminder rule and its editable draft.
 */
type ReminderRuleCardProps = {
	readonly rule: ReminderRule;
	readonly draft: ReminderRuleDraft;
	readonly disabled: boolean;
	readonly canManageReminders: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (ruleID: string, patch: ReminderRuleDraftPatch) => void;
	readonly onSave: (rule: ReminderRule) => Promise<void>;
};

/**
 * ReminderRuleCard renders one editable reminder rule.
 */
export function ReminderRuleCard(props: ReminderRuleCardProps): ReactElement {
	const parsedOffsets = parseReminderOffsets(props.draft.reminderOffsetsText);
	const changed = reminderRuleHasChanges(props.rule, props.draft);
	const formDisabled = props.disabled || !props.canManageReminders;

	return (
		<article className={reminderRuleCardClassName(props.draft.enabled)}>
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Schedule {shortID(props.rule.scheduleId)}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Reminder rule {shortID(props.rule.id)}
					</h3>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Updated {formatDateTime(props.rule.updatedAt)}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
						{props.draft.enabled ? 'Enabled' : 'Disabled'}
					</CampfireStatusPill>
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved' : 'Saved'}
					</CampfireStatusPill>
				</div>
			</div>

			<div className="cf:grid cf:gap-3 cf:xl:grid-cols-2">
				<CampfireCheckboxField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label="Enable this rule"
					description="Allow this schedule to send reminders."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.dmReminderEnabled}
					disabled={formDisabled}
					label="DM reminders"
					description="Send private reminders to users who have not submitted."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { dmReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.channelReminderEnabled}
					disabled={formDisabled}
					label="Channel reminders"
					description="Post a channel reminder when users are still missing."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { channelReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.mentionMissingInChannel}
					disabled={formDisabled}
					label="Mention missing users"
					description="Include missing users directly in the channel reminder."
					onCheckedChange={checked =>
						props.onDraftChange(props.rule.id, { mentionMissingInChannel: checked })
					}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor={`campfire-reminder-offsets-${props.rule.id}`}>Reminder offsets</Label>
				<Input
					id={`campfire-reminder-offsets-${props.rule.id}`}
					disabled={formDisabled}
					placeholder="0, 30, 45, 55"
					value={props.draft.reminderOffsetsText}
					onChange={event =>
						props.onDraftChange(props.rule.id, { reminderOffsetsText: event.currentTarget.value })
					}
				/>
				<p className="cf:flex cf:flex-wrap cf:items-center cf:gap-2 cf:text-xs cf:font-semibold cf:leading-5 cf:text-muted-foreground">
					<Timer className="cf:size-3.5 cf:text-amber-200" />
					Minute offsets from schedule time. Parsed as:{' '}
					<span className="cf:font-black cf:text-amber-100">
						{parsedOffsets.length === 0 ? 'none' : parsedOffsets.join(', ')}
					</span>
				</p>
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
				<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Users on approved leave and users who already submitted should be skipped by the scheduler.
				</p>

				<Button type="button" disabled={formDisabled || !changed} onClick={() => void props.onSave(props.rule)}>
					<Save className="cf:size-4" />
					{props.saving ? 'Saving…' : 'Save rule'}
				</Button>
			</div>
		</article>
	);
}
