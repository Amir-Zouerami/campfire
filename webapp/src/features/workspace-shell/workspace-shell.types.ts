import type { MeUserResponse } from '@/types/api';
import type { Workspace, WorkspaceCapabilities } from '@/types/domain';

/**
 * WorkspacePageID identifies the redesigned top-level Campfire workspace pages.
 */
export type WorkspacePageID = 'my-day' | 'team-review' | 'reports' | 'settings';

/**
 * WorkspacePageDefinition describes one top-level workspace destination.
 */
export type WorkspacePageDefinition = {
	readonly id: WorkspacePageID;
	readonly label: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly managerOnly: boolean;
};

/**
 * WorkspaceShellProps contains the data and callbacks shared by workspace pages.
 */
export type WorkspaceShellProps = {
	readonly workspace: Workspace;
	readonly capabilities: WorkspaceCapabilities;
	readonly canManageWorkspace: boolean;
	readonly isSystemAdmin: boolean;
	readonly currentUser: MeUserResponse;
	readonly leaveRefreshToken: number;
	readonly standupRefreshToken: number;
	readonly workspaceCalendarRefreshToken: number;
	readonly onClose: () => void;
	readonly onRefresh: () => void;
	readonly onLeaveCreated: () => void;
	readonly onLeaveDecided: () => void;
	readonly onLeaveCancelled: () => void;
	readonly onStandupSubmitted: () => void;
	readonly onStandupConfigurationChanged: () => void;
	readonly onWorkspaceCalendarChanged: () => void;
	readonly onWorkspaceSettingsChanged: () => void;
	readonly onWorkspaceArchived: () => void;
};
