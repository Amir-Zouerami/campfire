import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { AuditLogLoadState } from './audit-log.types';

/**
 * AuditLogFeedbackProps contains workflow feedback state.
 */
type AuditLogFeedbackProps = {
	readonly state: AuditLogLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * AuditLogFeedback renders compact workflow feedback and profile warnings.
 */
export function AuditLogFeedback(props: AuditLogFeedbackProps): ReactElement | null {
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
 * AuditLogLoading renders a compact loading state.
 */
export function AuditLogLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading audit log…" />;
}
