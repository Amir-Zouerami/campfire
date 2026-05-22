import { ApiClientError } from '@/api';
import type { WorkspaceRoleOverview } from '@/types/domain';

import type { RoleGroup } from './roles-access.types';

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
			title: 'Leads',
			description: 'Can manage workspace settings, schedules, forms, reminders, report rules, and team review.',
			userIDs: roles.leadUserIds,
			tone: 'ember',
		},
		{
			id: 'approvers',
			title: 'Approvers',
			description: 'Can approve or reject leave requests. They are not automatically full Leads.',
			userIDs: roles.approverUserIds,
			tone: 'green',
		},
		{
			id: 'viewers',
			title: 'Viewers',
			description: 'Can view reports and dashboards without editing workspace settings.',
			userIDs: roles.viewerUserIds,
			tone: 'slate',
		},
		{
			id: 'admins',
			title: 'Explicit Admins',
			description: 'Named Campfire admins for this workspace. System admin access is inherited separately.',
			userIDs: roles.adminUserIds,
			tone: 'green',
		},
		{
			id: 'members',
			title: 'Members',
			description: 'Channel members who can use their own standup, tasks/time, and leave workflows.',
			userIDs: roles.memberUserIds,
			tone: 'slate',
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
