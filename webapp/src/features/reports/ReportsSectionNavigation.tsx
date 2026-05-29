import type { ReactElement } from 'react';

import {
	CampfireSectionTabs,
	type CampfireSectionTab,
} from '@/components/campfire/CampfireLayoutPrimitives';

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
 * ReportsSectionNavigation renders Reports sub-page navigation using the shared
 * Campfire pill-tab primitive instead of the older card-like section grid.
 */
export function ReportsSectionNavigation(props: ReportsSectionNavigationProps): ReactElement {
	const tabs: CampfireSectionTab<ReportsSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: section.label,
		description: section.description,
	}));

	return (
		<CampfireSectionTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label="Reports sections"
			onChange={props.onSelectSection}
		/>
	);
}
