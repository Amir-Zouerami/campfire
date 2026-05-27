import type { ReactElement } from 'react';

import { teamReviewSectionButtonClassName } from './team-review.helpers';
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
 * TeamReviewSectionNavigation renders Team Review sub-page navigation.
 */
export function TeamReviewSectionNavigation(props: TeamReviewSectionNavigationProps): ReactElement {
	return (
		<nav className="campfire-section-nav" aria-label="Team Review sections">
			{props.sections.map(section => (
				<button
					key={section.id}
					type="button"
					className={teamReviewSectionButtonClassName(section.id === props.activeSection)}
					aria-current={section.id === props.activeSection ? 'page' : undefined}
					onClick={() => props.onSelectSection(section.id)}
				>
					<span className="cf:text-base cf:font-black">{section.label}</span>
					<span className="cf:text-sm cf:font-semibold cf:text-muted-foreground">{section.description}</span>
				</button>
			))}
		</nav>
	);
}
