import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { RolesAccessLoadState } from './roles-access.types';

/**
 * RolesAccessFeedbackProps contains workflow feedback state.
 */
type RolesAccessFeedbackProps = {
	readonly state: RolesAccessLoadState;
	readonly message: string;
	readonly messageTone: 'success' | 'error';
	readonly profileErrorMessage: string;
};

/**
 * RolesAccessFeedback renders compact workflow feedback and profile warnings.
 */
export function RolesAccessFeedback(props: RolesAccessFeedbackProps): ReactElement | null {
	return (
		<CampfireFeedbackList
			items={[
				{
					key: 'workflow-message',
					message: props.message,
					tone: props.state === 'error' ? 'error' as const : props.messageTone,
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
 * RolesAccessLoading renders a compact loading state.
 */
export function RolesAccessLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('settings.roles.loading')} />;
}
