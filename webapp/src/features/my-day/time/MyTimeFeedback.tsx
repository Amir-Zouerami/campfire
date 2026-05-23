import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { MyTimeLoadState } from './my-time.types';

/**
 * MyTimeFeedbackProps contains user-facing tasks/time feedback state.
 */
type MyTimeFeedbackProps = {
	readonly state: MyTimeLoadState;
	readonly message: string;
};

/**
 * MyTimeFeedback renders status and error feedback for the time-log flow.
 */
export function MyTimeFeedback(props: MyTimeFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * MyTimeLoading renders a compact loading state.
 */
export function MyTimeLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading tasks and recent time…" />;
}
