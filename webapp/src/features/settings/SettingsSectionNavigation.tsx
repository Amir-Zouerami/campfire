import type { ReactElement } from 'react';

import {
	CampfireSectionTabs,
	type CampfireSectionTab,
} from '@/components/campfire/CampfireLayoutPrimitives';

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
 * matte pill-tab system used by Reports and Team Review.
 */
export function SettingsSectionNavigation(props: SettingsSectionNavigationProps): ReactElement {
	const tabs: CampfireSectionTab<SettingsSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: section.label,
		description: section.description,
	}));

	return (
		<CampfireSectionTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label="Settings sections"
			onChange={props.onSelectSection}
		/>
	);
}
