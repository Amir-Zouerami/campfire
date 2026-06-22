import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { MyTimeLoadState } from './my-time.types';

/**
 * MyTimeFeedbackProps contains user-facing tasks/time feedback state.
 */
type MyTimeFeedbackProps = {
	readonly state: MyTimeLoadState;
	readonly message: string;
};

/**
 * MyTimeFeedback renders status and error feedback for the time-log flow.
 */
export function MyTimeFeedback(props: MyTimeFeedbackProps): ReactElement | null {
	if (props.state === 'error') {
		return <CampfireFeedback message={props.message} tone="error" showInlineError={true} />;
	}

	return <CampfireFeedback message={props.message} tone="success" />;
}

/**
 * MyTimeLoading renders a compact loading state.
 */
export function MyTimeLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('myDay.time.loading')} />;
}
