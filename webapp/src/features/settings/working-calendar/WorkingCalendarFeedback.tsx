import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { WorkingCalendarLoadState } from './working-calendar.types';

/**
 * WorkingCalendarFeedbackProps contains workflow feedback state.
 */
type WorkingCalendarFeedbackProps = {
	readonly state: WorkingCalendarLoadState;
	readonly message: string;
};

/**
 * WorkingCalendarFeedback renders compact local workflow feedback.
 */
export function WorkingCalendarFeedback(props: WorkingCalendarFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * WorkingCalendarLoading renders a compact loading state.
 */
export function WorkingCalendarLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading working calendar…" />;
}
