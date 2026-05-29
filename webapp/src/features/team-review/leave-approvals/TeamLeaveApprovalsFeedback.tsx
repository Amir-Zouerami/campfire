import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { TeamLeaveApprovalLoadState } from './team-leave-approvals.types';

/**
 * TeamLeaveApprovalsFeedbackProps contains workflow feedback state.
 */
type TeamLeaveApprovalsFeedbackProps = {
	readonly state: TeamLeaveApprovalLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TeamLeaveApprovalsFeedback renders compact workflow feedback and profile warnings.
 */
export function TeamLeaveApprovalsFeedback(props: TeamLeaveApprovalsFeedbackProps): ReactElement | null {
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
 * TeamLeaveApprovalsLoading renders a compact loading state.
 */
export function TeamLeaveApprovalsLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading pending leave requests…" />;
}
