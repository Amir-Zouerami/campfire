import type { TFunction } from '@/i18n/types';

import type { ReminderRuleDraft } from './reminders.types';
import type { StandupScheduleLabel } from '../standup-schedule-labels';

/**
 * localizedReminderRuleTitle returns a translated card title while preserving user-authored template names.
 */
export function localizedReminderRuleTitle(t: TFunction, label: StandupScheduleLabel): string {
	if (label.unavailable) {
		return t('settings.reminders.rule.unlinked.title');
	}

	return t('settings.reminders.rule.title', { templateName: label.templateName });
}

/**
 * localizedReminderRuleDescription describes one reminder window.
 */
export function localizedReminderRuleDescription(t: TFunction, label: StandupScheduleLabel): string {
	if (label.unavailable) {
		return t('settings.reminders.rule.unlinked.description');
	}

	return t('settings.reminders.rule.description', {
		openTime: label.opensAt,
		closeTime: label.timeOfDay,
	});
}

/**
 * localizedReminderDeliveryLabel returns a translated delivery summary.
 */
export function localizedReminderDeliveryLabel(t: TFunction, draft: ReminderRuleDraft): string {
	if (draft.dmReminderEnabled && draft.channelReminderEnabled) {
		return t('settings.reminders.delivery.dmAndChannel');
	}

	if (draft.dmReminderEnabled) {
		return t('settings.reminders.delivery.dmOnly');
	}

	if (draft.channelReminderEnabled) {
		return t('settings.reminders.delivery.channelOnly');
	}

	return t('settings.reminders.delivery.none');
}

/**
 * localizedReminderTimeLabels returns generated copy for the shared reminder-time editor.
 */
export function localizedReminderTimeLabels(t: TFunction) {
	return {
		windowKicker: t('settings.reminders.time.windowKicker'),
		windowTitle: (openTime: string, closeTime: string) => t('settings.reminders.time.windowTitle', { openTime, closeTime }),
		gridAriaLabel: t('settings.reminders.time.gridAriaLabel'),
		reminderLabel: (position: number) => t('settings.reminders.time.reminderLabel', { position: String(position) }),
		clearReminderAriaLabel: (position: number) => t('settings.reminders.time.clearReminderAriaLabel', { position: String(position) }),
	};
}
