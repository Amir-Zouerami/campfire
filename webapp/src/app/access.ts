import type { WorkspaceCapabilities } from '@/shared/types/domain';

/**
 * Access is what the signed-in user may see and do in the workspace.
 */
export type Access = {
	readonly isSystemAdmin: boolean;
	readonly capabilities: WorkspaceCapabilities;
};

/**
 * isManager reports whether the user manages the workspace (a Lead or a system admin).
 */
export function isManager(access: Access): boolean {
	return access.isSystemAdmin || access.capabilities.canManageWorkspace;
}

/**
 * accessRoleKey returns the translation key describing the user's highest role.
 */
export function accessRoleKey(
	access: Access,
):
	| 'workspace.access.systemAdmin'
	| 'workspace.access.workspaceLead'
	| 'workspace.access.approver'
	| 'workspace.access.viewer'
	| 'workspace.access.member' {
	if (access.isSystemAdmin) {
		return 'workspace.access.systemAdmin';
	}

	if (access.capabilities.canManageWorkspace) {
		return 'workspace.access.workspaceLead';
	}

	if (access.capabilities.canApproveLeaves) {
		return 'workspace.access.approver';
	}

	return access.capabilities.canViewWorkspaceReports ? 'workspace.access.viewer' : 'workspace.access.member';
}
