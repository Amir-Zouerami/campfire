import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { TeamStandupsLoadState } from './team-standups.types';

/**
 * TeamStandupsFeedbackProps contains workflow feedback state.
 */
type TeamStandupsFeedbackProps = {
	readonly state: TeamStandupsLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TeamStandupsFeedback renders compact workflow feedback and profile warnings.
 */
export function TeamStandupsFeedback(props: TeamStandupsFeedbackProps): ReactElement | null {
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
 * TeamStandupsLoading renders a compact loading state.
 */
export function TeamStandupsLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('teamReview.standups.loading')} />;
}
