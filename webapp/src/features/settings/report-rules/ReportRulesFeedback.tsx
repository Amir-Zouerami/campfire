import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { ReportRulesLoadState } from './report-rules.types';

/**
 * ReportRulesFeedbackProps contains workflow feedback state.
 */
type ReportRulesFeedbackProps = {
	readonly state: ReportRulesLoadState;
	readonly message: string;
	readonly messageTone?: 'success' | 'error';
};

/**
 * ReportRulesFeedback renders compact local workflow feedback.
 */
export function ReportRulesFeedback(props: ReportRulesFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.messageTone ?? (props.state === 'error' ? 'error' : 'success')} />;
}

/**
 * ReportRulesLoading renders a compact loading state.
 */
export function ReportRulesLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('settings.reportRules.loading')} />;
}
