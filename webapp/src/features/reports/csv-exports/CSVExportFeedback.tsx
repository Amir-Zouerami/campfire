import type { ReactElement } from 'react';

import { CampfireFeedback } from '@/components/campfire/CampfireFeedback';
import { CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

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
	return (
		<CampfireFeedback
			message={props.message}
			tone={props.state === 'error' ? 'error' : 'success'}
			showInlineError={true}
		/>
	);
}

/**
 * CSVExportLoading renders a compact loading state.
 */
export function CSVExportLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('reports.csv.loading')} />;
}
