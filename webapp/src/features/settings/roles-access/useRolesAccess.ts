import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteWorkspaceRole, listWorkspaceRoles, upsertWorkspaceRole } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
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
	readonly messageTone: 'success' | 'error';
	readonly savingKey: string;
	readonly isBusy: boolean;
	readonly updateAssignmentDraft: (patch: Partial<RoleAssignmentDraft>) => void;
	readonly assignRole: () => Promise<void>;
	readonly removeRole: (role: AssignableWorkspaceRole, userID: string) => Promise<void>;
	readonly reload: () => Promise<void>;
};

/**
 * useRolesAccess owns workspace role query state and role mutations.
 */
export function useRolesAccess(input: UseRolesAccessInput): UseRolesAccessResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [assignmentDraft, setAssignmentDraft] = useState<RoleAssignmentDraft>(emptyRoleAssignmentDraft());
	const [message, setMessage] = useState('');
	const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
	const [savingKey, setSavingKey] = useState('');

	const rolesQueryKey = campfireQueryKeys.workspaceRoles(input.workspace.id);
	const rolesQuery = useQuery({
		queryKey: rolesQueryKey,
		queryFn: () => listWorkspaceRoles(input.workspace.id),
	});

	const assignMutation = useMutation({
		mutationFn: async () => {
			return upsertWorkspaceRole(input.workspace.id, {
				userId: assignmentDraft.userID.trim(),
				role: assignmentDraft.role,
			});
		},
		onSuccess: response => {
			queryClient.setQueryData(rolesQueryKey, response);
			setAssignmentDraft(emptyRoleAssignmentDraft());
			setSavingKey('');
			setMessage(t('settings.roles.toast.assigned'));
			setMessageTone('success');
			toast.success(t('settings.roles.toast.assigned'));
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);
			setSavingKey('');
			setMessage(errorMessage);
			setMessageTone('error');
			toast.error(errorMessage);
		},
	});

	const removeMutation = useMutation({
		mutationFn: async (inputValue: { readonly role: AssignableWorkspaceRole; readonly userID: string }) => {
			return deleteWorkspaceRole(input.workspace.id, inputValue.role, inputValue.userID);
		},
		onSuccess: response => {
			queryClient.setQueryData(rolesQueryKey, response);
			setSavingKey('');
			const successMessage = response.deleted
				? t('settings.roles.toast.removed')
				: t('settings.roles.toast.alreadyAbsent');
			setMessage(successMessage);
			setMessageTone('success');
			toast.success(successMessage);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);
			setSavingKey('');
			setMessage(errorMessage);
			setMessageTone('error');
			toast.error(errorMessage);
		},
	});

	const roles = rolesQuery.data?.roles ?? null;
	const roleGroups = useMemo(() => buildRoleGroups(roles), [roles]);
	const userIDsForProfiles = useMemo(() => collectRoleUserIDs(roles), [roles]);
	const loadState = deriveRolesLoadState(
		rolesQuery.isLoading,
		rolesQuery.isError,
		assignMutation.isPending || removeMutation.isPending,
		roles,
	);
	const isBusy = rolesQuery.isLoading || assignMutation.isPending || removeMutation.isPending;
	const currentMessage = rolesQuery.isError ? errorToMessage(rolesQuery.error, t) : message;

	/**
	 * reload manually reloads role data.
	 */
	async function reload(): Promise<void> {
		setMessage('');
		setMessageTone('success');
		await rolesQuery.refetch();
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
			setMessage(t('settings.roles.error.permission'));
			setMessageTone('error');
			return;
		}

		const validationMessage = validateRoleAssignmentDraft(assignmentDraft, t);
		if (validationMessage !== null) {
			setMessage(validationMessage);
			setMessageTone('error');
			return;
		}

		setSavingKey('assign-role');
		setMessage('');
		setMessageTone('success');
		await assignMutation.mutateAsync().catch(() => undefined);
	}

	/**
	 * removeRole removes a named role assignment.
	 */
	async function removeRole(role: AssignableWorkspaceRole, userID: string): Promise<void> {
		if (!input.canManageRoles) {
			setMessage(t('settings.roles.error.permission'));
			setMessageTone('error');
			return;
		}

		if (!isAssignableWorkspaceRole(role)) {
			return;
		}

		const cleanUserID = userID.trim();
		if (cleanUserID === '') {
			return;
		}

		setSavingKey(`${role}:${cleanUserID}`);
		setMessage('');
		setMessageTone('success');
		await removeMutation.mutateAsync({ role, userID: cleanUserID }).catch(() => undefined);
	}

	return {
		loadState,
		roles,
		roleGroups,
		userIDsForProfiles,
		assignmentDraft,
		message: currentMessage,
		messageTone: rolesQuery.isError ? 'error' : messageTone,
		savingKey,
		isBusy,
		updateAssignmentDraft,
		assignRole,
		removeRole,
		reload,
	};
}

/**
 * deriveRolesLoadState keeps page rendering independent from TanStack internals.
 */
function deriveRolesLoadState(
	isLoading: boolean,
	isError: boolean,
	isSaving: boolean,
	roles: WorkspaceRoleOverview | null,
): RolesAccessLoadState {
	if (isSaving) {
		return 'saving';
	}

	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	if (roles !== null) {
		return 'ready';
	}

	return 'idle';
}
