import { ApiClientError } from '@/api';
import type { Role, WorkspaceRoleOverview } from '@/types/domain';

import type { AssignableWorkspaceRole, RoleAssignmentDraft, RoleGroup } from './roles-access.types';

/**
 * ASSIGNABLE_WORKSPACE_ROLES lists roles that can be manually assigned.
 */
export const ASSIGNABLE_WORKSPACE_ROLES: readonly AssignableWorkspaceRole[] = ['lead', 'approver', 'viewer', 'admin'];

/**
 * emptyRoleAssignmentDraft returns the default add-role form state.
 */
export function emptyRoleAssignmentDraft(): RoleAssignmentDraft {
	return {
		userID: '',
		role: 'lead',
	};
}

/**
 * collectRoleUserIDs returns unique user IDs referenced by role overview.
 */
export function collectRoleUserIDs(roles: WorkspaceRoleOverview | null): readonly string[] {
	if (roles === null) {
		return [];
	}

	return uniqueStrings([
		...roles.memberUserIds,
		...roles.leadUserIds,
		...roles.approverUserIds,
		...roles.adminUserIds,
		...roles.viewerUserIds,
	]);
}

/**
 * buildRoleGroups returns visible role groups for the overview.
 */
export function buildRoleGroups(roles: WorkspaceRoleOverview | null): readonly RoleGroup[] {
	if (roles === null) {
		return [];
	}

	return [
		{
			id: 'leads',
			role: 'lead',
			title: 'Leads',
			description: 'Can manage workspace settings, schedules, forms, reminders, report rules, and team review.',
			userIDs: roles.leadUserIds,
			tone: 'ember',
			removable: true,
		},
		{
			id: 'approvers',
			role: 'approver',
			title: 'Approvers',
			description: 'Can approve or reject leave requests. They are not automatically full Leads.',
			userIDs: roles.approverUserIds,
			tone: 'green',
			removable: true,
		},
		{
			id: 'viewers',
			role: 'viewer',
			title: 'Viewers',
			description: 'Can view reports and dashboards without editing workspace settings.',
			userIDs: roles.viewerUserIds,
			tone: 'slate',
			removable: true,
		},
		{
			id: 'admins',
			role: 'admin',
			title: 'Explicit Admins',
			description: 'Named Campfire admins for this workspace. System admin access is inherited separately.',
			userIDs: roles.adminUserIds,
			tone: 'green',
			removable: true,
		},
		{
			id: 'members',
			role: 'member',
			title: 'Members',
			description: 'Channel members who can use their own standup, tasks/time, and leave workflows.',
			userIDs: roles.memberUserIds,
			tone: 'slate',
			removable: false,
		},
	];
}

/**
 * roleGroupCount returns total users across role groups.
 */
export function roleGroupCount(groups: readonly RoleGroup[]): number {
	return groups.reduce((total, group) => total + group.userIDs.length, 0);
}

/**
 * validateRoleAssignmentDraft validates the add-role form.
 */
export function validateRoleAssignmentDraft(draft: RoleAssignmentDraft): string | null {
	if (draft.userID.trim() === '') {
		return 'Choose a workspace member before assigning a role.';
	}

	if (!ASSIGNABLE_WORKSPACE_ROLES.includes(draft.role)) {
		return 'Choose a valid role.';
	}

	return null;
}

/**
 * toAssignableWorkspaceRole narrows unsafe select values.
 */
export function toAssignableWorkspaceRole(value: string): AssignableWorkspaceRole {
	if (ASSIGNABLE_WORKSPACE_ROLES.includes(value as AssignableWorkspaceRole)) {
		return value as AssignableWorkspaceRole;
	}

	return 'lead';
}

/**
 * isAssignableWorkspaceRole reports whether a role is manually assignable.
 */
export function isAssignableWorkspaceRole(role: Role): role is AssignableWorkspaceRole {
	return role !== 'member';
}

/**
 * roleLabel returns a readable role label.
 */
export function roleLabel(role: Role): string {
	switch (role) {
		case 'lead':
			return 'Lead';
		case 'approver':
			return 'Approver';
		case 'viewer':
			return 'Viewer';
		case 'admin':
			return 'Admin';
		case 'member':
			return 'Member';
	}
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load workspace roles.';
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
