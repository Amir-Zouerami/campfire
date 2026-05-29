import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { CSVExportLoadState } from './csv-exports.types';

/**
 * CSVExportFeedbackProps contains workflow feedback state.
 */
type CSVExportFeedbackProps = {
	readonly state: CSVExportLoadState;
	readonly message: string;
};

/**
 * CSVExportFeedback renders compact local workflow feedback.
 */
export function CSVExportFeedback(props: CSVExportFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * CSVExportLoading renders a compact loading state.
 */
export function CSVExportLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Preparing CSV export…" />;
}
