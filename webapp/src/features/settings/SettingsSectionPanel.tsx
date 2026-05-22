import type { ReactElement } from 'react';

import { StandupConfigurationCard } from '@/app/StandupConfigurationCard';
import { StandupFormBuilderCard } from '@/app/StandupFormBuilderCard';
import { StandupScheduleBuilderCard } from '@/app/StandupScheduleBuilderCard';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { AuditLogPage } from './audit-log/AuditLogPage';
import { GlobalOffDaysPage } from './global-off-days/GlobalOffDaysPage';
import { ReminderSettingsPage } from './reminders/ReminderSettingsPage';
import { ReportRulesSettingsPage } from './report-rules/ReportRulesSettingsPage';
import { RolesAccessPage } from './roles-access/RolesAccessPage';
import type { SettingsSectionID } from './settings.types';
import { WorkspaceOverviewPanel } from './WorkspaceOverviewPanel';
import { WorkingCalendarPage } from './working-calendar/WorkingCalendarPage';

/**
 * SettingsSectionPanelProps contains the selected settings section.
 */
type SettingsSectionPanelProps = WorkspaceShellProps & {
	readonly activeSection: SettingsSectionID;
};

/**
 * SettingsSectionPanel renders the selected settings sub-page.
 */
export function SettingsSectionPanel(props: SettingsSectionPanelProps): ReactElement {
	switch (props.activeSection) {
		case 'overview':
			return <WorkspaceOverviewPanel {...props} />;

		case 'roles':
			return <RolesAccessPage {...props} />;

		case 'calendar':
			return <WorkingCalendarPage {...props} />;

		case 'standups':
			return (
				<div className="cf:grid cf:gap-5">
					<StandupConfigurationCard workspace={props.workspace} />

					<StandupScheduleBuilderCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						onConfigurationChanged={props.onStandupConfigurationChanged}
					/>

					<StandupFormBuilderCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						onConfigurationChanged={props.onStandupConfigurationChanged}
					/>
				</div>
			);

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
