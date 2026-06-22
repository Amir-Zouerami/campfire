import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { TeamAvailabilityLoadState } from './team-availability.types';

/**
 * TeamAvailabilityFeedbackProps contains workflow feedback state.
 */
type TeamAvailabilityFeedbackProps = {
	readonly state: TeamAvailabilityLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TeamAvailabilityFeedback renders compact workflow feedback and profile warnings.
 */
export function TeamAvailabilityFeedback(props: TeamAvailabilityFeedbackProps): ReactElement | null {
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
 * TeamAvailabilityLoading renders a compact loading state.
 */
export function TeamAvailabilityLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('teamReview.availability.loading')} />;
}
