import { useEffect, useMemo, useState } from 'react';

import { listWorkspaceRoles } from '@/api';
import type { Workspace, WorkspaceRoleOverview } from '@/types/domain';

import { buildRoleGroups, collectRoleUserIDs, errorToMessage } from './roles-access.helpers';
import type { RoleGroup, RolesAccessLoadState } from './roles-access.types';

/**
 * UseRolesAccessInput contains workspace context.
 */
type UseRolesAccessInput = {
	readonly workspace: Workspace;
};

/**
 * UseRolesAccessResult contains roles/access overview state.
 */
export type UseRolesAccessResult = {
	readonly loadState: RolesAccessLoadState;
	readonly roles: WorkspaceRoleOverview | null;
	readonly roleGroups: readonly RoleGroup[];
	readonly userIDsForProfiles: readonly string[];
	readonly message: string;
	readonly isBusy: boolean;
};

/**
 * useRolesAccess owns loading workspace effective access.
 */
export function useRolesAccess(input: UseRolesAccessInput): UseRolesAccessResult {
	const [loadState, setLoadState] = useState<RolesAccessLoadState>('idle');
	const [roles, setRoles] = useState<WorkspaceRoleOverview | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadRoles loads workspace role settings and effective role groups.
		 */
		async function loadRoles(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceRoles(input.workspace.id);

				if (!isActive) {
					return;
				}

				setRoles(response.roles);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadRoles();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id]);

	const roleGroups = useMemo(() => buildRoleGroups(roles), [roles]);
	const userIDsForProfiles = useMemo(() => collectRoleUserIDs(roles), [roles]);

	return {
		loadState,
		roles,
		roleGroups,
		userIDsForProfiles,
		message,
		isBusy: loadState === 'loading',
	};
}
