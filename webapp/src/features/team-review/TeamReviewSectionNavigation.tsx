import type { ReactElement } from 'react';

import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';

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
	const tabs: CampfireSegmentedTab<TeamReviewSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: section.label,
		description: section.description,
	}));

	return (
		<CampfireSegmentedTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label="Team Review sections"
			onChange={props.onSelectSection}
		/>
	);
}
