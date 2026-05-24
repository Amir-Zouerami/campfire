import type { ReactElement } from 'react';

import { myDaySections } from './my-day.sections';
import { iconForMyDaySection, myDaySectionButtonClassName, myDaySectionIconClassName } from './my-day.helpers';
import type { MyDaySectionID } from './my-day.types';

/**
 * MyDaySectionNavigationProps contains the active personal workflow navigation state.
 */
type MyDaySectionNavigationProps = {
	readonly activeSectionID: MyDaySectionID;
	readonly onSelectSection: (sectionID: MyDaySectionID) => void;
};

/**
 * MyDaySectionNavigation renders focused personal workflow buttons.
 */
export function MyDaySectionNavigation(props: MyDaySectionNavigationProps): ReactElement {
	return (
		<nav className="campfire-my-day-nav" aria-label="My Day workflow">
			{myDaySections.map(section => {
				const active = section.id === props.activeSectionID;
				const Icon = iconForMyDaySection(section.id);

				return (
					<button
						key={section.id}
						type="button"
						aria-current={active ? 'page' : undefined}
						className={myDaySectionButtonClassName(active)}
						onClick={() => props.onSelectSection(section.id)}
					>
						<span className={myDaySectionIconClassName(active)}>
							<Icon className="cf:size-5" />
						</span>

						<span className="cf:min-w-0">
							<span className="cf:block cf:text-base cf:font-black cf:tracking-[-0.02em] cf:text-foreground">
								{section.label}
							</span>
							<span className="cf:mt-1 cf:block cf:text-sm cf:font-semibold cf:leading-5 cf:text-muted-foreground">
								{section.helper}
							</span>
						</span>
					</button>
				);
			})}
		</nav>
	);
}
