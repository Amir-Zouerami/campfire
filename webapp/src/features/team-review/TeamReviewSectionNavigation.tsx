import type { ReactElement } from 'react';

import {
	CampfireSectionTabs,
	type CampfireSectionTab,
} from '@/components/campfire/CampfireLayoutPrimitives';

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
 * shared Campfire pill-tab primitive.
 */
export function TeamReviewSectionNavigation(props: TeamReviewSectionNavigationProps): ReactElement {
	const tabs: CampfireSectionTab<TeamReviewSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: section.label,
		description: section.description,
	}));

	return (
		<CampfireSectionTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label="Team Review sections"
			onChange={props.onSelectSection}
		/>
	);
}
