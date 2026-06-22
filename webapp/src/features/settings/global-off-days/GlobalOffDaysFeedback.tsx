import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { GlobalOffDaysLoadState } from './global-off-days.types';

/**
 * GlobalOffDaysFeedbackProps contains workflow feedback state.
 */
type GlobalOffDaysFeedbackProps = {
	readonly state: GlobalOffDaysLoadState;
	readonly message: string;
};

/**
 * GlobalOffDaysFeedback renders compact local workflow feedback.
 */
export function GlobalOffDaysFeedback(props: GlobalOffDaysFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * GlobalOffDaysLoading renders a compact loading state.
 */
export function GlobalOffDaysLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('settings.globalOffDays.loading')} />;
}
