import type { ReactElement } from 'react';

import { settingsSectionButtonClassName } from './settings.helpers';
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
 * SettingsSectionNavigation renders Settings sub-page navigation.
 */
export function SettingsSectionNavigation(props: SettingsSectionNavigationProps): ReactElement {
	return (
		<nav className="campfire-section-nav campfire-section-nav--settings" aria-label="Settings sections">
			{props.sections.map(section => (
				<button
					key={section.id}
					type="button"
					className={settingsSectionButtonClassName(section.id === props.activeSection)}
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
