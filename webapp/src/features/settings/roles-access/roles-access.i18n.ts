import type { TFunction } from '@/i18n/types';
import type { Role } from '@/types/domain';

import type { RoleGroup, RoleGroupID } from './roles-access.types';

/**
 * localizedRoleLabel returns a generated UI label for a Campfire role.
 */
export function localizedRoleLabel(t: TFunction, role: Role): string {
	switch (role) {
		case 'lead':
			return t('settings.roles.role.lead');
		case 'approver':
			return t('settings.roles.role.approver');
		case 'viewer':
			return t('settings.roles.role.viewer');
		case 'admin':
			return t('settings.roles.role.admin');
		case 'member':
			return t('settings.roles.role.member');
		case 'excluded':
			return t('settings.roles.role.excluded');
	}
}

/**
 * localizedRoleGroupTitle returns the display title for one role group.
 */
export function localizedRoleGroupTitle(t: TFunction, groupID: RoleGroupID): string {
	switch (groupID) {
		case 'leads':
			return t('settings.roles.group.leads.title');
		case 'approvers':
			return t('settings.roles.group.approvers.title');
		case 'viewers':
			return t('settings.roles.group.viewers.title');
		case 'admins':
			return t('settings.roles.group.admins.title');
		case 'excluded':
			return t('settings.roles.group.excluded.title');
		case 'members':
			return t('settings.roles.group.members.title');
	}
}

/**
 * localizedRoleGroupDescription returns the explanatory copy for one role group.
 */
export function localizedRoleGroupDescription(t: TFunction, groupID: RoleGroupID): string {
	switch (groupID) {
		case 'leads':
			return t('settings.roles.group.leads.description');
		case 'approvers':
			return t('settings.roles.group.approvers.description');
		case 'viewers':
			return t('settings.roles.group.viewers.description');
		case 'admins':
			return t('settings.roles.group.admins.description');
		case 'excluded':
			return t('settings.roles.group.excluded.description');
		case 'members':
			return t('settings.roles.group.members.description');
	}
}

/**
 * formatRoleGroupUserCount returns localized compact user-count text.
 */
export function formatRoleGroupUserCount(t: TFunction, count: number): string {
	return t(count === 1 ? 'settings.roles.group.count.singular' : 'settings.roles.group.count.plural', {
		count: String(count),
	});
}

/**
 * roleGroupEmptyTitle returns a localized empty-state title for one group.
 */
export function roleGroupEmptyTitle(t: TFunction, group: RoleGroup): string {
	return t('settings.roles.group.empty.title', {
		group: localizedRoleGroupTitle(t, group.id),
	});
}
