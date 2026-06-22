import type { ReactElement } from 'react';

import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';
import { useI18n } from '@/i18n';

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
	const { t } = useI18n();
	const tabs: CampfireSegmentedTab<SettingsSectionID>[] = props.sections.map(section => ({
		value: section.id,
		label: t(section.labelKey),
		description: t(section.descriptionKey),
	}));

	return (
		<CampfireSegmentedTabs
			tabs={tabs}
			activeValue={props.activeSection}
			label={t('settings.sections.ariaLabel')}
			onChange={props.onSelectSection}
		/>
	);
}
