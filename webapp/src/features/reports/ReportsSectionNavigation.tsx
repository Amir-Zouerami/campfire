import type { ReactElement } from 'react';

import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';
import { useI18n } from '@/i18n';

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
 * Campfire segmented-tab primitive instead of the older card-like section grid.
 */
export function ReportsSectionNavigation(props: ReportsSectionNavigationProps): ReactElement {
	const { t } = useI18n();
	const tabs: CampfireSegmentedTab<ReportsSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: t(section.labelKey),
		description: t(section.descriptionKey),
	}));

	return (
		<CampfireSegmentedTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label={t('reports.sections.ariaLabel')}
			onChange={props.onSelectSection}
		/>
	);
}
