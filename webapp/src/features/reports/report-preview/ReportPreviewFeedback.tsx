import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { ReportPreviewLoadState } from './report-preview.types';

/**
 * ReportPreviewFeedbackProps contains workflow feedback state.
 */
type ReportPreviewFeedbackProps = {
	readonly state: ReportPreviewLoadState;
	readonly message: string;
};

/**
 * ReportPreviewFeedback renders compact local workflow feedback.
 */
export function ReportPreviewFeedback(props: ReportPreviewFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * ReportPreviewLoading renders a compact loading state.
 */
export function ReportPreviewLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading report preview…" />;
}
