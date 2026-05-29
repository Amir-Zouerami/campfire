import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { ReportRulesLoadState } from './report-rules.types';

/**
 * ReportRulesFeedbackProps contains workflow feedback state.
 */
type ReportRulesFeedbackProps = {
	readonly state: ReportRulesLoadState;
	readonly message: string;
};

/**
 * ReportRulesFeedback renders compact local workflow feedback.
 */
export function ReportRulesFeedback(props: ReportRulesFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * ReportRulesLoading renders a compact loading state.
 */
export function ReportRulesLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading report rules…" />;
}
