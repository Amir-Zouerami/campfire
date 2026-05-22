import type { ReactElement } from 'react';

import { CampfireWorkspaceShell } from '@/features/workspace-shell/CampfireWorkspaceShell';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';
import type { Workspace, WorkspaceCapabilities } from '@/types/domain';

/**
 * CampfireWorkspaceTabsProps contains workspace data and refresh callbacks.
 *
 * This wrapper preserves the old component name while the redesigned workspace
 * shell moves into feature-owned files.
 */
type CampfireWorkspaceTabsProps = {
	readonly workspace: Workspace;
	readonly capabilities?: WorkspaceCapabilities;
	readonly canManageWorkspace: boolean;
	readonly isSystemAdmin: boolean;
	readonly leaveRefreshToken: number;
	readonly standupRefreshToken: number;
	readonly workspaceCalendarRefreshToken: number;
	readonly onLeaveCreated: () => void;
	readonly onLeaveDecided: () => void;
	readonly onLeaveCancelled: () => void;
	readonly onStandupSubmitted: () => void;
	readonly onStandupConfigurationChanged: () => void;
	readonly onWorkspaceCalendarChanged: () => void;
};

/**
 * CampfireWorkspaceTabs renders the redesigned workspace shell.
 */
export function CampfireWorkspaceTabs(props: CampfireWorkspaceTabsProps): ReactElement {
	const shellProps: WorkspaceShellProps = {
		workspace: props.workspace,
		capabilities: props.capabilities ?? fallbackCapabilities(props.canManageWorkspace, props.isSystemAdmin),
		canManageWorkspace: props.canManageWorkspace,
		isSystemAdmin: props.isSystemAdmin,
		leaveRefreshToken: props.leaveRefreshToken,
		standupRefreshToken: props.standupRefreshToken,
		workspaceCalendarRefreshToken: props.workspaceCalendarRefreshToken,
		onLeaveCreated: props.onLeaveCreated,
		onLeaveDecided: props.onLeaveDecided,
		onLeaveCancelled: props.onLeaveCancelled,
		onStandupSubmitted: props.onStandupSubmitted,
		onStandupConfigurationChanged: props.onStandupConfigurationChanged,
		onWorkspaceCalendarChanged: props.onWorkspaceCalendarChanged,
	};

	return <CampfireWorkspaceShell {...shellProps} />;
}

/**
 * fallbackCapabilities preserves compatibility until every caller passes the
 * backend capability payload directly.
 */
function fallbackCapabilities(canManageWorkspace: boolean, isSystemAdmin: boolean): WorkspaceCapabilities {
	if (isSystemAdmin) {
		return {
			canSubmitStandup: true,
			canManageWorkspace: true,
			canManageStandups: true,
			canViewWorkspaceReports: true,
			canApproveLeaves: true,
			canViewGlobalReports: true,
			canExportReports: true,
		};
	}

	if (canManageWorkspace) {
		return {
			canSubmitStandup: true,
			canManageWorkspace: true,
			canManageStandups: true,
			canViewWorkspaceReports: true,
			canApproveLeaves: true,
			canViewGlobalReports: false,
			canExportReports: true,
		};
	}

	return {
		canSubmitStandup: true,
		canManageWorkspace: false,
		canManageStandups: false,
		canViewWorkspaceReports: false,
		canApproveLeaves: false,
		canViewGlobalReports: false,
		canExportReports: false,
	};
}
