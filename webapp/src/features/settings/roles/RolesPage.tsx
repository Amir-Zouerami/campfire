import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { deleteWorkspaceRole, listWorkspaceRoles, upsertWorkspaceRole } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID, useWorkspaceSession } from '@/shared/session';
import type { WorkspaceRoleOverview } from '@/shared/types/domain';
import { useUserDirectory, UserLabel, UserPicker } from '@/shared/users';
import {
	Button,
	Container,
	DescriptionList,
	EmptyState,
	Field,
	Grid,
	IconButton,
	Inline,
	ListRow,
	ListRows,
	PageHeader,
	QueryView,
	Section,
	Select,
	Stack,
	Stat,
	StatusText,
	toast,
} from '@/shared/ui';

import { ASSIGNABLE_ROLES, GROUP_DESCRIPTION, GROUP_TITLE, ROLE_LABEL, roleGroupsOf } from './roleGroups';
import type { AssignableRole } from './roleGroups';

/**
 * RolesPage shows who can do what in this workspace, and lets a manager grant or remove
 * named Campfire roles. Channel members are members automatically; named roles add permissions.
 */
export function RolesPage(): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const { isSystemAdmin } = useWorkspaceSession();
	const roles = useQuery({
		queryKey: workspaceKey(workspaceID, 'settings', 'roles'),
		queryFn: async () => (await listWorkspaceRoles(workspaceID)).roles,
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.roles.page.eyebrow')}
				title={t('settings.roles.page.title')}
				description={t('settings.roles.page.description')}
			/>
			<QueryView query={roles} loadingTitle={t('settings.roles.loading')} errorTitle={t('settings.roles.error.load')}>
				{overview => (
					<>
						<Inline gap={10} wrap>
							<Stat
								label={t('settings.roles.stats.accessMode.label')}
								value={t(isSystemAdmin ? 'settings.roles.stats.accessMode.systemAdmin' : 'settings.roles.stats.accessMode.capability')}
							/>
							<Stat label={t('settings.roles.stats.leads.label')} value={overview.leadUserIds.length} />
							<Stat label={t('settings.roles.stats.approvers.label')} value={overview.approverUserIds.length} />
							<Stat label={t('settings.roles.stats.excluded.label')} value={overview.excludedUserIds.length} />
						</Inline>
						<AssignRole workspaceID={workspaceID} />
						<RoleGroups workspaceID={workspaceID} overview={overview} />
						<Behavior overview={overview} />
						<Guide />
					</>
				)}
			</QueryView>
		</Container>
	);
}

/**
 * useRoleCache keeps the roles query current from a mutation's response, which already
 * contains the updated overview.
 */
function useStoreRoles(workspaceID: string): (overview: WorkspaceRoleOverview) => void {
	const queryClient = useQueryClient();

	return overview => {
		queryClient.setQueryData(workspaceKey(workspaceID, 'settings', 'roles'), overview);
	};
}

function AssignRole(props: { readonly workspaceID: string }): ReactElement {
	const { t } = useI18n();
	const store = useStoreRoles(props.workspaceID);
	const [userID, setUserID] = useState('');
	const [role, setRole] = useState<AssignableRole>('lead');
	const [error, setError] = useState('');

	const assign = useMutation({
		mutationFn: () => upsertWorkspaceRole(props.workspaceID, { userId: userID.trim(), role }),
		onSuccess: response => {
			store(response.roles);
			setUserID('');
			setRole('lead');
			toast.success(t('settings.roles.toast.assigned'));
		},
	});

	return (
		<Section
			eyebrow={t('settings.roles.assignment.eyebrow')}
			title={t('settings.roles.assignment.title')}
			description={t('settings.roles.assignment.description')}
		>
			<form
				noValidate
				onSubmit={event => {
					event.preventDefault();
					if (userID.trim() === '') {
						setError(t('settings.roles.validation.userRequired'));
						return;
					}

					setError('');
					assign.mutate();
				}}
			>
				<Stack gap={4}>
					<Grid columns={2}>
						<Field label={t('settings.roles.assignment.user.label')} error={error === '' ? undefined : error}>
							<UserPicker value={userID} onChange={setUserID} />
						</Field>
						<Field label={t('settings.roles.assignment.access.label')}>
							<Select
								value={role}
								onChange={value => setRole(value as AssignableRole)}
								options={ASSIGNABLE_ROLES.map(option => ({ value: option, label: t(ROLE_LABEL[option]) }))}
							/>
						</Field>
					</Grid>
					<div>
						<Button type="submit" icon={UserPlus} loading={assign.isPending}>
							{t('settings.roles.assignment.submit')}
						</Button>
					</div>
				</Stack>
			</form>
		</Section>
	);
}

function RoleGroups(props: { readonly workspaceID: string; readonly overview: WorkspaceRoleOverview }): ReactElement {
	const { t } = useI18n();
	const store = useStoreRoles(props.workspaceID);
	const [removing, setRemoving] = useState('');
	const directory = useUserDirectory([
		...props.overview.leadUserIds,
		...props.overview.approverUserIds,
		...props.overview.viewerUserIds,
		...props.overview.adminUserIds,
		...props.overview.excludedUserIds,
	]);

	const remove = useMutation({
		mutationFn: (input: { readonly role: AssignableRole; readonly userID: string }) =>
			deleteWorkspaceRole(props.workspaceID, input.role, input.userID),
		onMutate: input => setRemoving(`${input.role}:${input.userID}`),
		onSuccess: response => {
			store(response.roles);
			toast.success(t(response.deleted ? 'settings.roles.toast.removed' : 'settings.roles.toast.alreadyAbsent'));
		},
		onSettled: () => setRemoving(''),
	});

	return (
		<Stack gap={10}>
			{roleGroupsOf(props.overview).map(group => {
				const title = t(GROUP_TITLE[group.role]);
				const role = group.role === 'member' ? null : group.role;

				return (
					<Section
						key={group.role}
						divided
						title={title}
						description={t(GROUP_DESCRIPTION[group.role])}
						actions={
							<StatusText kind={group.userIDs.length === 0 ? 'inactive' : 'approved'}>
								{t(group.userIDs.length === 1 ? 'settings.roles.group.count.singular' : 'settings.roles.group.count.plural', {
									count: String(group.userIDs.length),
								})}
							</StatusText>
						}
					>
						{group.userIDs.length === 0 ? (
							<EmptyState
								title={t('settings.roles.group.empty.title', { group: title })}
								description={t('settings.roles.group.empty.description')}
							/>
						) : (
							<ListRows label={title}>
								{group.userIDs.map(userID => (
									<ListRow
										key={userID}
										title={<UserLabel userID={userID} />}
										trailing={
											group.removable && role !== null ? (
												<IconButton
													icon={X}
													variant="ghost"
													label={t('settings.roles.group.remove.ariaLabel', {
														user: directory.nameOf(userID, t('common.unknown')),
														group: title,
													})}
													disabled={removing === `${role}:${userID}`}
													onClick={() => remove.mutate({ role, userID })}
												/>
											) : undefined
										}
									/>
								))}
							</ListRows>
						)}
					</Section>
				);
			})}
		</Stack>
	);
}

function Behavior(props: { readonly overview: WorkspaceRoleOverview }): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const { settings } = props.overview;
	const rows = [
		{
			title: t('settings.roles.behavior.channelAdmins.title'),
			description: t('settings.roles.behavior.channelAdmins.description'),
			enabled: settings.channelAdminsAreLeads,
		},
		{
			title: t('settings.roles.behavior.systemAdmins.title'),
			description: t('settings.roles.behavior.systemAdmins.description'),
			enabled: settings.systemAdminsAreAdmins,
		},
	];

	return (
		<Section
			divided
			eyebrow={t('settings.roles.behavior.eyebrow')}
			title={t('settings.roles.behavior.title')}
			description={t('settings.roles.behavior.updated', { date: formatTimestamp(settings.updatedAt) })}
		>
			<ListRows label={t('settings.roles.behavior.title')}>
				{rows.map(row => (
					<ListRow
						key={row.title}
						title={row.title}
						subtitle={row.description}
						trailing={
							<StatusText kind={row.enabled ? 'approved' : 'inactive'}>
								{t(row.enabled ? 'settings.roles.status.enabled' : 'settings.roles.status.disabled')}
							</StatusText>
						}
					/>
				))}
			</ListRows>
		</Section>
	);
}

function Guide(): ReactElement {
	const { t } = useI18n();

	return (
		<Section
			divided
			eyebrow={t('settings.roles.guide.eyebrow')}
			title={t('settings.roles.guide.title')}
			description={t('settings.roles.guide.description')}
		>
			<DescriptionList
				items={[
					{ term: t('settings.roles.role.member'), detail: t('settings.roles.guide.member.description') },
					{ term: t('settings.roles.role.lead'), detail: t('settings.roles.guide.lead.description') },
					{ term: t('settings.roles.role.approver'), detail: t('settings.roles.guide.approver.description') },
					{ term: t('settings.roles.role.viewer'), detail: t('settings.roles.guide.viewer.description') },
					{ term: t('settings.roles.role.admin'), detail: t('settings.roles.guide.admin.description') },
				]}
			/>
		</Section>
	);
}
