import type { ReactElement } from 'react';

import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';

import type { SettingsSection, SettingsSectionID } from './settings.types';

/**
 * SettingsSectionNavigationProps contains settings navigation state.
 */
type SettingsSectionNavigationProps = {
	readonly activeSection: SettingsSectionID;
	readonly sections: readonly SettingsSection[];
	readonly onSelectSection: (section: SettingsSectionID) => void;
};

/**
 * SettingsSectionNavigation renders Settings sub-page navigation with the same
 * matte segmented-tab system used by Reports and Team Review.
 */
export function SettingsSectionNavigation(props: SettingsSectionNavigationProps): ReactElement {
	const tabs: CampfireSegmentedTab<SettingsSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: section.label,
		description: section.description,
	}));

	return (
		<CampfireSegmentedTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label="Settings sections"
			onChange={props.onSelectSection}
		/>
	);
}
