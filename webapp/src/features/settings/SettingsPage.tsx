import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { RestrictedSettingsState } from './RestrictedSettingsState';
import { SettingsSectionNavigation } from './SettingsSectionNavigation';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { resolveSettingsSection, visibleSettingsSections } from './settings.helpers';
import type { SettingsSectionID } from './settings.types';

/**
 * SettingsPage renders workspace configuration as separated sub-pages.
 */
export function SettingsPage(props: WorkspaceShellProps): ReactElement {
	const [activeSection, setActiveSection] = useState<SettingsSectionID>('overview');

	const canViewSettings = props.isSystemAdmin || props.canManageWorkspace;

	const visibleSections = useMemo(() => {
		return visibleSettingsSections(props.isSystemAdmin);
	}, [props.isSystemAdmin]);

	const resolvedSection = useMemo(() => {
		return resolveSettingsSection(activeSection, visibleSections);
	}, [activeSection, visibleSections]);

	if (!canViewSettings || resolvedSection === null) {
		return <RestrictedSettingsState />;
	}

	return (
		<div className="cf:grid cf:gap-4">
			<SettingsSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			<SettingsSectionPanel activeSection={resolvedSection.id} {...props} />
		</div>
	);
}
