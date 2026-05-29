import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { GlobalReportLoadState } from './global-reports.types';

/**
 * GlobalReportsFeedbackProps contains workflow feedback state.
 */
type GlobalReportsFeedbackProps = {
	readonly state: GlobalReportLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * GlobalReportsFeedback renders compact workflow feedback and profile warnings.
 */
export function GlobalReportsFeedback(props: GlobalReportsFeedbackProps): ReactElement | null {
	return (
		<CampfireFeedbackList
			items={[
				{
					key: 'workflow-message',
					message: props.message,
					tone: props.state === 'error' ? 'error' as const : 'success' as const,
				},
				{
					key: 'profile-warning',
					message: props.profileErrorMessage,
					tone: 'warning' as const,
				},
			]}
		/>
	);
}

/**
 * GlobalReportsLoading renders a compact loading state.
 */
export function GlobalReportsLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading global report…" />;
}
