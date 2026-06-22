import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

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
					showInlineError: props.state === 'error',
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
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('teamReview.approvals.loading')} />;
}
