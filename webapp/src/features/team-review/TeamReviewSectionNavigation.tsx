import type { ReactElement } from 'react';

import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';
import { useI18n } from '@/i18n';

import type { TeamReviewSection, TeamReviewSectionID } from './team-review.types';

/**
 * TeamReviewSectionNavigationProps contains Team Review navigation state.
 */
type TeamReviewSectionNavigationProps = {
	readonly activeSection: TeamReviewSectionID;
	readonly sections: readonly TeamReviewSection[];
	readonly onSelectSection: (section: TeamReviewSectionID) => void;
};

/**
 * TeamReviewSectionNavigation renders Team Review sub-page navigation using the
 * shared Campfire segmented-tab primitive.
 */
export function TeamReviewSectionNavigation(props: TeamReviewSectionNavigationProps): ReactElement {
	const { t } = useI18n();
	const tabs: CampfireSegmentedTab<TeamReviewSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: t(section.labelKey),
		description: t(section.descriptionKey),
	}));

	return (
		<CampfireSegmentedTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label={t('teamReview.sections.ariaLabel')}
			onChange={props.onSelectSection}
		/>
	);
}
