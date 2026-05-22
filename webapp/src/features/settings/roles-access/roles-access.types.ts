/**
 * RolesAccessLoadState describes roles/access loading state.
 */
export type RolesAccessLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * RoleGroupTone identifies the status tone for a role group.
 */
export type RoleGroupTone = 'ember' | 'green' | 'slate';

/**
 * RoleGroup describes one displayed workspace role group.
 */
export type RoleGroup = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly userIDs: readonly string[];
	readonly tone: RoleGroupTone;
};
