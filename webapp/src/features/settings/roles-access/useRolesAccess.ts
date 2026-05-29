import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { deleteWorkspaceRole, listWorkspaceRoles, upsertWorkspaceRole } from '@/api';
import type { Workspace, WorkspaceRoleOverview } from '@/types/domain';

import {
	buildRoleGroups,
	collectRoleUserIDs,
	emptyRoleAssignmentDraft,
	errorToMessage,
	isAssignableWorkspaceRole,
	validateRoleAssignmentDraft,
} from './roles-access.helpers';
import type {
	AssignableWorkspaceRole,
	RoleAssignmentDraft,
	RoleGroup,
	RolesAccessLoadState,
} from './roles-access.types';

/**
 * UseRolesAccessInput contains workspace context and management permission.
 */
type UseRolesAccessInput = {
	readonly workspace: Workspace;
	readonly canManageRoles: boolean;
};

/**
 * UseRolesAccessResult contains roles/access overview state.
 */
export type UseRolesAccessResult = {
	readonly loadState: RolesAccessLoadState;
	readonly roles: WorkspaceRoleOverview | null;
	readonly roleGroups: readonly RoleGroup[];
	readonly userIDsForProfiles: readonly string[];
	readonly assignmentDraft: RoleAssignmentDraft;
	readonly message: string;
	readonly savingKey: string;
	readonly isBusy: boolean;
	readonly updateAssignmentDraft: (patch: Partial<RoleAssignmentDraft>) => void;
	readonly assignRole: () => Promise<void>;
	readonly removeRole: (role: AssignableWorkspaceRole, userID: string) => Promise<void>;
	readonly reload: () => Promise<void>;
};

/**
 * useRolesAccess owns loading and mutating workspace role assignments.
 */
export function useRolesAccess(input: UseRolesAccessInput): UseRolesAccessResult {
	const [loadState, setLoadState] = useState<RolesAccessLoadState>('idle');
	const [roles, setRoles] = useState<WorkspaceRoleOverview | null>(null);
	const [assignmentDraft, setAssignmentDraft] = useState<RoleAssignmentDraft>(emptyRoleAssignmentDraft());
	const [message, setMessage] = useState('');
	const [savingKey, setSavingKey] = useState('');

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
	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * reload manually reloads role data.
	 */
	async function reload(): Promise<void> {
		setLoadState('loading');
		setMessage('');

		try {
			const response = await listWorkspaceRoles(input.workspace.id);
			setRoles(response.roles);
			setLoadState('ready');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * updateAssignmentDraft patches the add-role form state.
	 */
	function updateAssignmentDraft(patch: Partial<RoleAssignmentDraft>): void {
		setAssignmentDraft(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * assignRole adds the selected role for the selected user.
	 */
	async function assignRole(): Promise<void> {
		if (!input.canManageRoles) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage role assignments.');
			return;
		}

		const validationMessage = validateRoleAssignmentDraft(assignmentDraft);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingKey('assign-role');
		setMessage('');

		try {
			const response = await upsertWorkspaceRole(input.workspace.id, {
				userId: assignmentDraft.userID.trim(),
				role: assignmentDraft.role,
			});

			setRoles(response.roles);
			setAssignmentDraft(emptyRoleAssignmentDraft());
			setLoadState('ready');
			setSavingKey('');
			setMessage('Role assigned.');
			toast.success('Role assigned.');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setSavingKey('');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * removeRole removes a named role assignment.
	 */
	async function removeRole(role: AssignableWorkspaceRole, userID: string): Promise<void> {
		if (!input.canManageRoles) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage role assignments.');
			return;
		}

		if (!isAssignableWorkspaceRole(role)) {
			return;
		}

		const cleanUserID = userID.trim();
		if (cleanUserID === '') {
			return;
		}

		const key = `${role}:${cleanUserID}`;

		setLoadState('saving');
		setSavingKey(key);
		setMessage('');

		try {
			const response = await deleteWorkspaceRole(input.workspace.id, role, cleanUserID);

			setRoles(response.roles);
			setLoadState('ready');
			setSavingKey('');
			setMessage(response.deleted ? 'Role removed.' : 'Role assignment was already absent.');
			toast.success(response.deleted ? 'Role removed.' : 'Role assignment was already absent.');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setSavingKey('');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		roles,
		roleGroups,
		userIDsForProfiles,
		assignmentDraft,
		message,
		savingKey,
		isBusy,
		updateAssignmentDraft,
		assignRole,
		removeRole,
		reload,
	};
}