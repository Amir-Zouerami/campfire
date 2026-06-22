import type { ReactElement } from 'react';

import { CampfireFeedbackList, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { TimeReportLoadState } from './time-report.types';

/**
 * TimeReportFeedbackProps contains workflow feedback state.
 */
type TimeReportFeedbackProps = {
	readonly state: TimeReportLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TimeReportFeedback renders compact workflow feedback and profile warnings.
 */
export function TimeReportFeedback(props: TimeReportFeedbackProps): ReactElement | null {
	return (
		<CampfireFeedbackList
			items={[
				{
					key: 'workflow-message',
					message: props.message,
					tone: props.state === 'error' ? 'error' as const : 'success' as const,
					showInlineError: true,
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
 * TimeReportLoading renders a compact loading state.
 */
export function TimeReportLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('reports.time.loading')} />;
}
