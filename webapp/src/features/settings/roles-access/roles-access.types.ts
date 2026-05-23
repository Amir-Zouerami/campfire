import type { Role } from '@/types/domain';

/**
 * RolesAccessLoadState describes roles/access loading and mutation state.
 */
export type RolesAccessLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * AssignableWorkspaceRole is a named role that can be manually assigned.
 */
export type AssignableWorkspaceRole = Exclude<Role, 'member'>;

/**
 * RoleGroupTone identifies the status tone for a role group.
 */
export type RoleGroupTone = 'ember' | 'green' | 'slate';

/**
 * RoleGroup describes one displayed workspace role group.
 */
export type RoleGroup = {
	readonly id: string;
	readonly role: Role;
	readonly title: string;
	readonly description: string;
	readonly userIDs: readonly string[];
	readonly tone: RoleGroupTone;
	readonly removable: boolean;
};

/**
 * RoleAssignmentDraft contains the add-role form state.
 */
export type RoleAssignmentDraft = {
	readonly userID: string;
	readonly role: AssignableWorkspaceRole;
};
