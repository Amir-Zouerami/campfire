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
		<div className="cf:flex cf:flex-wrap cf:gap-3">
			{props.sections.map(section => (
				<button
					key={section.id}
					type="button"
					className={settingsSectionButtonClassName(section.id === props.activeSection)}
					onClick={() => props.onSelectSection(section.id)}
				>
					<span className="cf:text-base cf:font-black">{section.label}</span>
					<span className="cf:text-sm cf:font-semibold cf:text-muted-foreground">{section.description}</span>
				</button>
			))}
		</div>
	);
}
