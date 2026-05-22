import type { ReactElement } from 'react';

import { reportSectionButtonClassName } from './reports.helpers';
import type { ReportsSection, ReportsSectionID } from './reports.types';

/**
 * ReportsSectionNavigationProps contains report navigation state.
 */
type ReportsSectionNavigationProps = {
	readonly activeSection: ReportsSectionID;
	readonly sections: readonly ReportsSection[];
	readonly onSelectSection: (section: ReportsSectionID) => void;
};

/**
 * ReportsSectionNavigation renders Reports sub-page navigation.
 */
export function ReportsSectionNavigation(props: ReportsSectionNavigationProps): ReactElement {
	return (
		<div className="cf:flex cf:flex-wrap cf:gap-3">
			{props.sections.map(section => (
				<button
					key={section.id}
					type="button"
					className={reportSectionButtonClassName(section.id === props.activeSection)}
					onClick={() => props.onSelectSection(section.id)}
				>
					<span className="cf:text-base cf:font-black">{section.label}</span>
					<span className="cf:text-sm cf:font-semibold cf:text-muted-foreground">{section.description}</span>
				</button>
			))}
		</div>
	);
}
