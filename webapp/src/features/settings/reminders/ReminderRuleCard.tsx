import type { ReactElement } from 'react';
import { BellRing, Loader2, Save } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireReminderTimeFields } from '@/components/campfire/CampfireReminderTimeFields';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';
import type { ReminderRule } from '@/types/domain';

import type { StandupScheduleLabel } from '../standup-schedule-labels';
import {
	localizedReminderDeliveryLabel,
	localizedReminderRuleDescription,
	localizedReminderRuleTitle,
	localizedReminderTimeLabels,
} from './reminder-settings.i18n';
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
	const { t } = useI18n();
	const changed = reminderRuleHasChanges(props.rule, props.draft, props.scheduleLabel.opensAt, props.scheduleLabel.timeOfDay);
	const formDisabled = props.disabled || !props.canManageReminders;
	const validationMessage = reminderTimeValidationMessage(
		props.draft.reminderTimes,
		props.scheduleLabel.opensAt,
		props.scheduleLabel.timeOfDay,
		t,
	);

	return (
		<CampfireSettingsPanel
			className={props.draft.enabled ? 'campfire-rule-panel' : 'campfire-rule-panel campfire-rule-panel--disabled'}
			title={localizedReminderRuleTitle(t, props.scheduleLabel)}
			description={localizedReminderRuleDescription(t, props.scheduleLabel)}
			icon={BellRing}
			meta={
				<div className="campfire-rule-meta-stack">
					<span>{localizedReminderDeliveryLabel(t, props.draft)}</span>
					<span>{props.draft.enabled ? t('common.enabled') : t('common.disabled')}</span>
					<span>{changed ? t('common.unsavedChanges') : t('common.saved')}</span>
					{props.scheduleLabel.unavailable && <span>{t('settings.schedule.missing')}</span>}
				</div>
			}
		>
			<div className="campfire-settings-choice-grid">
				<CampfireCheckboxField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label={t('settings.reminders.field.enabled.label')}
					description={t('settings.reminders.field.enabled.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.dmReminderEnabled}
					disabled={formDisabled}
					label={t('settings.reminders.field.dm.label')}
					description={t('settings.reminders.field.dm.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { dmReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.channelReminderEnabled}
					disabled={formDisabled}
					label={t('settings.reminders.field.channel.label')}
					description={t('settings.reminders.field.channel.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { channelReminderEnabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.mentionMissingInChannel}
					disabled={formDisabled}
					label={t('settings.reminders.field.mentionMissing.label')}
					description={t('settings.reminders.field.mentionMissing.description')}
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
				labels={localizedReminderTimeLabels(t)}
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
					{props.saving ? t('common.saving') : t('settings.reminders.action.save')}
				</CampfireControlButton>
			</div>
		</CampfireSettingsPanel>
	);
}

/**
 * replaceReminderTime replaces one reminder time slot while preserving three slots.
 */
function replaceReminderTime(times: readonly string[], index: number, value: string): readonly string[] {
	const nextTimes = [times[0] ?? '', times[1] ?? '', times[2] ?? ''];
	nextTimes[index] = value;

	return nextTimes;
}
