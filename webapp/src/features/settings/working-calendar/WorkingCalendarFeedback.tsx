import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { WorkingCalendarFeedbackTone, WorkingCalendarLoadState } from './working-calendar.types';

/**
 * WorkingCalendarFeedbackProps contains workflow feedback state.
 */
type WorkingCalendarFeedbackProps = {
	readonly state: WorkingCalendarLoadState;
	readonly message: string;
	readonly tone: WorkingCalendarFeedbackTone;
};

/**
 * WorkingCalendarFeedback renders compact local workflow feedback.
 */
export function WorkingCalendarFeedback(props: WorkingCalendarFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.tone} />;
}

/**
 * WorkingCalendarLoading renders a compact loading state.
 */
export function WorkingCalendarLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('settings.workingCalendar.loading')} />;
}
