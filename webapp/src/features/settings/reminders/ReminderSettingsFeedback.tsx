import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { ReminderSettingsLoadState } from './reminders.types';

/**
 * ReminderSettingsFeedbackProps contains workflow feedback state.
 */
type ReminderSettingsFeedbackProps = {
	readonly state: ReminderSettingsLoadState;
	readonly message: string;
};

/**
 * ReminderSettingsFeedback renders compact local workflow feedback.
 */
export function ReminderSettingsFeedback(props: ReminderSettingsFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * ReminderSettingsLoading renders a compact loading state.
 */
export function ReminderSettingsLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading reminder settings…" />;
}
