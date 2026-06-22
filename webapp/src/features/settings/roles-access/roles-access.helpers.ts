import { ApiClientError } from '@/api';
import type { TFunction } from '@/i18n';
import type { Role, WorkspaceRoleOverview } from '@/types/domain';

import type { AssignableWorkspaceRole, RoleAssignmentDraft, RoleGroup } from './roles-access.types';

/**
 * ASSIGNABLE_WORKSPACE_ROLES lists roles that can be manually assigned.
 */
export const ASSIGNABLE_WORKSPACE_ROLES: readonly AssignableWorkspaceRole[] = ['lead', 'approver', 'viewer', 'admin', 'excluded'];

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
		...roles.excludedUserIds,
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
			userIDs: roles.leadUserIds,
			tone: 'ember',
			removable: true,
		},
		{
			id: 'approvers',
			role: 'approver',
			userIDs: roles.approverUserIds,
			tone: 'green',
			removable: true,
		},
		{
			id: 'viewers',
			role: 'viewer',
			userIDs: roles.viewerUserIds,
			tone: 'slate',
			removable: true,
		},
		{
			id: 'admins',
			role: 'admin',
			userIDs: roles.adminUserIds,
			tone: 'green',
			removable: true,
		},
		{
			id: 'excluded',
			role: 'excluded',
			userIDs: roles.excludedUserIds,
			tone: 'slate',
			removable: true,
		},
		{
			id: 'members',
			role: 'member',
			userIDs: roles.memberUserIds,
			tone: 'slate',
			removable: false,
		},
	];
}

/**
 * validateRoleAssignmentDraft validates the add-role form.
 */
export function validateRoleAssignmentDraft(
	draft: RoleAssignmentDraft,
	t: TFunction,
): string | null {
	if (draft.userID.trim() === '') {
		return t('settings.roles.validation.userRequired');
	}

	if (!ASSIGNABLE_WORKSPACE_ROLES.includes(draft.role)) {
		return t('settings.roles.validation.roleRequired');
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
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string, language: string = 'english'): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	const locale = language === 'persian' ? 'fa-IR' : language === 'arabic' ? 'ar' : 'en';

	return date.toLocaleString(locale);
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown, t: TFunction): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return t('settings.roles.error.load');
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
