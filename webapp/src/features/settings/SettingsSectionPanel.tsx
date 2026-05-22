import type { ReactElement } from 'react';

import { AuditLogCard } from '@/app/AuditLogCard';
import { GlobalOffDaysCard } from '@/app/GlobalOffDaysCard';
import { ReminderSettingsCard } from '@/app/ReminderSettingsCard';
import { ReportSettingsCard } from '@/app/ReportSettingsCard';
import { StandupConfigurationCard } from '@/app/StandupConfigurationCard';
import { StandupFormBuilderCard } from '@/app/StandupFormBuilderCard';
import { StandupScheduleBuilderCard } from '@/app/StandupScheduleBuilderCard';
import { WorkspaceOffDaysCard } from '@/app/WorkspaceOffDaysCard';
import { WorkspaceRolesCard } from '@/app/WorkspaceRolesCard';
import { WorkspaceWorkingDaysCard } from '@/app/WorkspaceWorkingDaysCard';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import type { SettingsSectionID } from './settings.types';
import { WorkspaceOverviewPanel } from './WorkspaceOverviewPanel';

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
			return <WorkspaceRolesCard workspace={props.workspace} isSystemAdmin={props.isSystemAdmin} />;

		case 'calendar':
			return (
				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<WorkspaceWorkingDaysCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						refreshToken={props.workspaceCalendarRefreshToken}
						onWorkingDaysChanged={props.onWorkspaceCalendarChanged}
					/>

					<WorkspaceOffDaysCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						refreshToken={props.workspaceCalendarRefreshToken}
						onOffDaysChanged={props.onWorkspaceCalendarChanged}
					/>
				</div>
			);

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
			return <ReminderSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />;

		case 'reports':
			return <ReportSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />;

		case 'audit':
			return <AuditLogCard workspace={props.workspace} />;

		case 'global':
			return <GlobalOffDaysCard isSystemAdmin={props.isSystemAdmin} />;
	}
}
