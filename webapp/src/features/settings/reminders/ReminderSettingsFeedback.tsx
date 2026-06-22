import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { ReminderSettingsLoadState } from './reminders.types';

/**
 * ReminderSettingsFeedbackProps contains workflow feedback state.
 */
type ReminderSettingsFeedbackProps = {
	readonly state: ReminderSettingsLoadState;
	readonly message: string;
	readonly messageTone?: 'success' | 'error';
};

/**
 * ReminderSettingsFeedback renders compact local workflow feedback.
 */
export function ReminderSettingsFeedback(props: ReminderSettingsFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.messageTone ?? (props.state === 'error' ? 'error' : 'success')} />;
}

/**
 * ReminderSettingsLoading renders a compact loading state.
 */
export function ReminderSettingsLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('settings.reminders.loading')} />;
}
