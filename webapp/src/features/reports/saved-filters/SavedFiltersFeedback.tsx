import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';
import { useI18n } from '@/i18n';

import type { SavedFiltersLoadState } from './saved-filters.types';

/**
 * SavedFiltersFeedbackProps contains workflow feedback state.
 */
type SavedFiltersFeedbackProps = {
	readonly state: SavedFiltersLoadState;
	readonly message: string;
};

/**
 * SavedFiltersFeedback renders compact local workflow feedback.
 */
export function SavedFiltersFeedback(props: SavedFiltersFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * SavedFiltersLoading renders a compact loading state.
 */
export function SavedFiltersLoading(): ReactElement {
	const { t } = useI18n();

	return <CampfireLoadingFeedback message={t('reports.saved.loading')} />;
}
