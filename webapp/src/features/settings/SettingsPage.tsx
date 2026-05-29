import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { CampfirePageHeader } from '@/components/campfire/CampfireLayoutPrimitives';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { AuditLogPage } from './audit-log/AuditLogPage';
import { GlobalOffDaysPage } from './global-off-days/GlobalOffDaysPage';
import { ReminderSettingsPage } from './reminders/ReminderSettingsPage';
import { ReportRulesSettingsPage } from './report-rules/ReportRulesSettingsPage';
import { RestrictedSettingsState } from './RestrictedSettingsState';
import { RolesAccessPage } from './roles-access/RolesAccessPage';
import { SettingsSectionNavigation } from './SettingsSectionNavigation';
import { resolveSettingsSection, visibleSettingsSections } from './settings.helpers';
import type { SettingsSectionID } from './settings.types';
import { StandupSettingsPage } from './standups/StandupSettingsPage';
import { WorkspaceOverviewPanel } from './WorkspaceOverviewPanel';
import { WorkingCalendarPage } from './working-calendar/WorkingCalendarPage';

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
		<div className="campfire-page-stack">
			<CampfirePageHeader
				eyebrow="Settings"
				title={resolvedSection.label}
				description={resolvedSection.description}
			/>

			<SettingsSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			{renderSettingsSection(resolvedSection.id, props)}
		</div>
	);
}

/**
 * renderSettingsSection renders the selected settings workflow without an
 * extra pass-through section panel component.
 */
function renderSettingsSection(activeSection: SettingsSectionID, props: WorkspaceShellProps): ReactElement {
	switch (activeSection) {
		case 'overview':
			return <WorkspaceOverviewPanel {...props} />;

		case 'roles':
			return <RolesAccessPage {...props} />;

		case 'calendar':
			return <WorkingCalendarPage {...props} />;

		case 'standups':
			return <StandupSettingsPage {...props} />;

		case 'reminders':
			return <ReminderSettingsPage {...props} />;

		case 'reports':
			return <ReportRulesSettingsPage {...props} />;

		case 'audit':
			return <AuditLogPage {...props} />;

		case 'global':
			return <GlobalOffDaysPage {...props} />;
	}
}
