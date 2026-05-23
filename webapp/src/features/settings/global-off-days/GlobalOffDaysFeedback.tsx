import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { GlobalOffDaysLoadState } from './global-off-days.types';

/**
 * GlobalOffDaysFeedbackProps contains global off-day feedback state.
 */
type GlobalOffDaysFeedbackProps = {
	readonly state: GlobalOffDaysLoadState;
	readonly message: string;
};

/**
 * GlobalOffDaysFeedback renders global off-day success and error messages.
 */
export function GlobalOffDaysFeedback(props: GlobalOffDaysFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * GlobalOffDaysLoading renders a compact loading state.
 */
export function GlobalOffDaysLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading global off-days…" />;
}
