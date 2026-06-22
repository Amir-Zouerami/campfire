import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { MyStandupLoadState } from './my-standup.types';

/**
 * MyStandupFeedbackProps contains workflow feedback state.
 */
type MyStandupFeedbackProps = {
	readonly state: MyStandupLoadState;
	readonly message: string;
};

/**
 * MyStandupFeedback renders compact local workflow feedback.
 */
export function MyStandupFeedback(props: MyStandupFeedbackProps): ReactElement | null {
	return (
		<CampfireFeedback
			message={props.message}
			tone={props.state === 'error' ? 'error' : 'success'}
			showInlineError={props.state === 'error'}
		/>
	);
}

/**
 * MyStandupLoading renders a compact loading state.
 */
export function MyStandupLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('myDay.standup.loading.form')} />;
}
