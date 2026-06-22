import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { TeamRuntimeLoadState } from './team-runtime.types';

/**
 * TeamRuntimeFeedbackProps contains workflow feedback state.
 */
type TeamRuntimeFeedbackProps = {
	readonly state: TeamRuntimeLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TeamRuntimeFeedback renders compact workflow feedback and profile warnings.
 */
export function TeamRuntimeFeedback(props: TeamRuntimeFeedbackProps): ReactElement | null {
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
 * TeamRuntimeLoading renders a compact loading state.
 */
export function TeamRuntimeLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('teamReview.runtime.loading')} />;
}
