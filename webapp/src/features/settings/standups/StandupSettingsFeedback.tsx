import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { StandupSettingsLoadState } from './standup-settings.types';

/**
 * StandupSettingsFeedbackProps contains standup settings feedback state.
 */
type StandupSettingsFeedbackProps = {
	readonly state: StandupSettingsLoadState;
	readonly message: string;
};

/**
 * StandupSettingsFeedback renders success and error feedback.
 */
export function StandupSettingsFeedback(props: StandupSettingsFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * StandupSettingsLoading renders a compact loading state.
 */
export function StandupSettingsLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading standup settings…" />;
}
