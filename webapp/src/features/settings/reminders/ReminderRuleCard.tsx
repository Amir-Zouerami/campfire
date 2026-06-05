import type { ReactElement } from 'react';
import { BellRing, Loader2, Save } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireReminderTimeFields } from '@/components/campfire/CampfireReminderTimeFields';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { reminderRuleTitle, type StandupScheduleLabel } from '@/features/settings/standup-schedule-labels';
import type { ReminderRule } from '@/types/domain';

import {
	reminderRuleHasChanges,
	reminderTimeValidationMessage,
} from './reminders.helpers';
import type { ReminderRuleDraft, ReminderRuleDraftPatch } from './reminders.types';

/**
 * ReminderRuleCardProps contains one reminder rule and its editable draft.
 */
type ReminderRuleCardProps = {
	readonly scheduleLabel: StandupScheduleLabel;
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
	const changed = reminderRuleHasChanges(props.rule, props.draft, props.scheduleLabel.opensAt, props.scheduleLabel.timeOfDay);
	const formDisabled = props.disabled || !props.canManageReminders;
	const validationMessage = reminderTimeValidationMessage(props.draft.reminderTimes, props.scheduleLabel.opensAt, props.scheduleLabel.timeOfDay);

	return (
		<CampfireSettingsPanel
			className={props.draft.enabled ? 'campfire-rule-panel' : 'campfire-rule-panel campfire-rule-panel--disabled'}
			title={reminderRuleTitle(props.scheduleLabel)}
			description={`Window ${props.scheduleLabel.opensAt}–${props.scheduleLabel.timeOfDay}. Reminders only go to missing submitters.`}
			icon={BellRing}
			meta={
				<div className="campfire-rule-meta-stack">
					<span>{reminderDeliveryLabel(props.draft)}</span>
					<span>{props.draft.enabled ? 'Enabled' : 'Disabled'}</span>
					<span>{changed ? 'Unsaved changes' : 'Saved'}</span>
					{props.scheduleLabel.unavailable && <span>Missing schedule</span>}
				</div>
			}
		>
			<div className="campfire-settings-choice-grid">
				<CampfireCheckboxField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label="Enable reminders"
					description="Allow this schedule to send reminder nudges."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.dmReminderEnabled}
					disabled={formDisabled}
					label="DM missing users"
					description="Private reminder for each missing submitter."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { dmReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.channelReminderEnabled}
					disabled={formDisabled}
					label="Channel reminder"
					description="Post a shared reminder when people are still missing."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { channelReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.mentionMissingInChannel}
					disabled={formDisabled}
					label="Mention missing users"
					description="Mention missing users in the channel reminder."
					onCheckedChange={checked =>
						props.onDraftChange(props.rule.id, { mentionMissingInChannel: checked })
					}
				/>
			</div>

			<CampfireReminderTimeFields
				idPrefix={`campfire-reminder-${props.rule.id}`}
				openTime={props.scheduleLabel.opensAt}
				closeTime={props.scheduleLabel.timeOfDay}
				reminderTimes={props.draft.reminderTimes}
				disabled={formDisabled}
				validationMessage={validationMessage}
				onReminderTimeChange={(index, value) =>
					props.onDraftChange(props.rule.id, {
						reminderTimes: replaceReminderTime(props.draft.reminderTimes, index, value),
					})
				}
			/>

			<div className="campfire-settings-form-actions">
				<CampfireControlButton
					type="button"
					disabled={formDisabled || !changed}
					onClick={() => void props.onSave(props.rule)}
				>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					{props.saving ? 'Saving…' : 'Save reminders'}
				</CampfireControlButton>
			</div>
		</CampfireSettingsPanel>
	);
}

/**
 * reminderDeliveryLabel returns a readable delivery summary.
 */
function reminderDeliveryLabel(draft: ReminderRuleDraft): string {
	if (draft.dmReminderEnabled && draft.channelReminderEnabled) {
		return 'DM + channel';
	}

	if (draft.dmReminderEnabled) {
		return 'DM only';
	}

	if (draft.channelReminderEnabled) {
		return 'Channel only';
	}

	return 'No delivery';
}

/**
 * replaceReminderTime replaces one reminder time slot while preserving three slots.
 */
function replaceReminderTime(times: readonly string[], index: number, value: string): readonly string[] {
	const nextTimes = [times[0] ?? '', times[1] ?? '', times[2] ?? ''];
	nextTimes[index] = value;

	return nextTimes;
}
