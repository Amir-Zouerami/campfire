import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { MyLeaveLoadState, MyLeaveWarning } from './my-leave.types';

/**
 * MyLeaveFeedbackProps contains user-facing leave feedback state.
 */
type MyLeaveFeedbackProps = {
	readonly state: MyLeaveLoadState;
	readonly message: string;
};

/**
 * MyLeaveFeedback renders compact local leave feedback.
 */
export function MyLeaveFeedback(props: MyLeaveFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * MyLeaveWarnings renders non-blocking local leave warnings.
 */
export function MyLeaveWarnings(props: { readonly warnings: readonly MyLeaveWarning[] }): ReactElement | null {
	return (
		<CampfireFeedbackList
			items={props.warnings.map(warning => ({
				key: `${warning.kind}-${warning.message}`,
				message: warning.message,
				tone: 'warning' as const,
			}))}
		/>
	);
}

/**
 * MyLeaveLoading renders a compact loading state.
 */
export function MyLeaveLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading your leave options…" />;
}
