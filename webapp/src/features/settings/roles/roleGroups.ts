import type { TranslationKey } from '@/shared/i18n';
import type { Role, WorkspaceRoleOverview } from '@/shared/types/domain';

export type AssignableRole = Exclude<Role, 'member'>;

/**
 * ASSIGNABLE_ROLES are the roles a manager can grant, in the order they appear in the form.
 */
export const ASSIGNABLE_ROLES: readonly AssignableRole[] = ['lead', 'approver', 'viewer', 'admin', 'excluded'];

export type RoleGroup = {
	readonly role: Role;
	readonly userIDs: readonly string[];
	/** Members come from the Mattermost channel, so they cannot be removed here. */
	readonly removable: boolean;
};

/**
 * roleGroupsOf arranges the server's role overview into the groups shown on the page.
 */
export function roleGroupsOf(roles: WorkspaceRoleOverview): readonly RoleGroup[] {
	return [
		{ role: 'lead', userIDs: roles.leadUserIds, removable: true },
		{ role: 'approver', userIDs: roles.approverUserIds, removable: true },
		{ role: 'viewer', userIDs: roles.viewerUserIds, removable: true },
		{ role: 'admin', userIDs: roles.adminUserIds, removable: true },
		{ role: 'excluded', userIDs: roles.excludedUserIds, removable: true },
		{ role: 'member', userIDs: roles.memberUserIds, removable: false },
	];
}

/**
 * Translation keys for each role's name and its group on the page.
 */
export const ROLE_LABEL: Readonly<Record<Role, TranslationKey>> = {
	lead: 'settings.roles.role.lead',
	approver: 'settings.roles.role.approver',
	viewer: 'settings.roles.role.viewer',
	admin: 'settings.roles.role.admin',
	member: 'settings.roles.role.member',
	excluded: 'settings.roles.role.excluded',
};

export const GROUP_TITLE: Readonly<Record<Role, TranslationKey>> = {
	lead: 'settings.roles.group.leads.title',
	approver: 'settings.roles.group.approvers.title',
	viewer: 'settings.roles.group.viewers.title',
	admin: 'settings.roles.group.admins.title',
	excluded: 'settings.roles.group.excluded.title',
	member: 'settings.roles.group.members.title',
};

export const GROUP_DESCRIPTION: Readonly<Record<Role, TranslationKey>> = {
	lead: 'settings.roles.group.leads.description',
	approver: 'settings.roles.group.approvers.description',
	viewer: 'settings.roles.group.viewers.description',
	admin: 'settings.roles.group.admins.description',
	excluded: 'settings.roles.group.excluded.description',
	member: 'settings.roles.group.members.description',
};
