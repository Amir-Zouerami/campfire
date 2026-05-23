import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { SavedFiltersLoadState } from './saved-filters.types';

/**
 * SavedFiltersFeedbackProps contains saved-filter feedback state.
 */
type SavedFiltersFeedbackProps = {
	readonly state: SavedFiltersLoadState;
	readonly message: string;
};

/**
 * SavedFiltersFeedback renders saved-filter success and error messages.
 */
export function SavedFiltersFeedback(props: SavedFiltersFeedbackProps): ReactElement | null {
	return <CampfireFeedback message={props.message} tone={props.state === 'error' ? 'error' : 'success'} />;
}

/**
 * SavedFiltersLoading renders a compact loading state.
 */
export function SavedFiltersLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading saved report filters…" />;
}
