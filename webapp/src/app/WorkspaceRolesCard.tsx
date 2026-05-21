import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Crown, Loader2, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';

import { ApiClientError, listWorkspaceRoles } from '@/api';
import { Separator } from '@/components/ui/separator';
import type { Workspace, WorkspaceRoleOverview } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { useUserProfiles } from './useUserProfiles';

/**
 * WorkspaceRolesCardProps contains workspace and access data.
 */
type WorkspaceRolesCardProps = {
	readonly workspace: Workspace;
	readonly isSystemAdmin: boolean;
};

/**
 * LoadState describes the role card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * RoleGroup describes one displayed workspace role group.
 */
type RoleGroup = {
	readonly title: string;
	readonly description: string;
	readonly userIDs: readonly string[];
	readonly tone: 'ember' | 'green' | 'slate';
};

/**
 * WorkspaceRolesCard renders the MVP roles/settings view.
 */
export function WorkspaceRolesCard(props: WorkspaceRolesCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [roles, setRoles] = useState<WorkspaceRoleOverview | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads workspace role settings and assignments.
		 */
		async function loadRoles(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceRoles(props.workspace.id);

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
	}, [props.workspace.id]);

	const allUserIDs = useMemo(() => collectRoleUserIDs(roles), [roles]);
	const { errorMessage: profileErrorMessage, labelForUserID, loading: profilesLoading } = useUserProfiles(allUserIDs);

	const roleGroups = useMemo(() => buildRoleGroups(roles), [roles]);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Roles"
				title="Workspace roles"
				description="Simple MVP roles are resolved by the backend. Channel admins can be treated as Leads when the workspace setting is enabled."
				icon={ShieldCheck}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'Workspace scoped'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Members"
						value={String(roles?.memberUserIds.length ?? 0)}
						helper="Channel members"
						icon={UsersRound}
					/>
					<CampfireMetric
						label="Leads"
						value={String(roles?.leadUserIds.length ?? 0)}
						helper="Can manage workspace"
						icon={Crown}
					/>
					<CampfireMetric
						label="Approvers"
						value={String(roles?.approverUserIds.length ?? 0)}
						helper="Can decide leave"
						icon={UserCheck}
					/>
					<CampfireMetric
						label="Admins"
						value={String(roles?.adminUserIds.length ?? 0)}
						helper="Explicit admins"
						icon={ShieldCheck}
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{loadState === 'loading' && <LoadingRow label="Loading workspace roles…" />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}

				{roles !== null && (
					<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<div>
								<h3 className="cf:text-lg cf:font-black cf:text-white">Role behavior</h3>
								<p className="cf:mt-1 cf:text-sm cf:font-medium cf:text-slate-400">
									Workspace role settings returned by the backend.
								</p>
							</div>

							<div className="cf:flex cf:flex-wrap cf:gap-2">
								<CampfireStatusPill tone={roles.settings.channelAdminsAreLeads ? 'green' : 'slate'}>
									Channel admins as Leads: {roles.settings.channelAdminsAreLeads ? 'Yes' : 'No'}
								</CampfireStatusPill>
								<CampfireStatusPill tone={roles.settings.systemAdminsAreAdmins ? 'green' : 'slate'}>
									System admins as Admins: {roles.settings.systemAdminsAreAdmins ? 'Yes' : 'No'}
								</CampfireStatusPill>
							</div>
						</div>

						<Separator className="cf:my-4 cf:bg-white/10" />

						<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
							<SettingsFact label="Created" value={formatDateTime(roles.settings.createdAt)} />
							<SettingsFact label="Updated" value={formatDateTime(roles.settings.updatedAt)} />
						</div>
					</div>
				)}

				{roles === null && loadState !== 'loading' && loadState !== 'error' && (
					<CampfireEmpty
						icon={ShieldCheck}
						title="No roles loaded"
						description="Open a configured workspace to load its role overview."
					/>
				)}

				<div className="cf:grid cf:gap-4 cf:xl:grid-cols-2">
					{roleGroups.map(group => (
						<RoleGroupCard key={group.title} group={group} labelForUserID={labelForUserID} />
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * RoleGroupCard renders one role group.
 */
function RoleGroupCard(props: {
	readonly group: RoleGroup;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<div>
					<h3 className="cf:text-lg cf:font-black cf:text-white">{props.group.title}</h3>
					<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
						{props.group.description}
					</p>
				</div>

				<CampfireStatusPill tone={props.group.tone}>{props.group.userIDs.length}</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:flex cf:flex-wrap cf:gap-2">
				{props.group.userIDs.length === 0 && (
					<span className="cf:text-sm cf:font-medium cf:text-slate-400">
						No explicit users in this group.
					</span>
				)}

				{props.group.userIDs.map(userID => (
					<span
						key={userID}
						title={userID}
						className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/5 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-slate-200"
					>
						{props.labelForUserID(userID)}
					</span>
				))}
			</div>
		</section>
	);
}

/**
 * SettingsFact renders one compact settings fact.
 */
function SettingsFact(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
			<span className="cf:block cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-sm cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * MessageRow renders loading/error feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={
				isError
					? 'cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100'
					: 'cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-amber-100'
			}
		>
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * buildRoleGroups returns the displayed role groups.
 */
function buildRoleGroups(roles: WorkspaceRoleOverview | null): readonly RoleGroup[] {
	if (roles === null) {
		return [];
	}

	return [
		{
			title: 'Members',
			description: 'Mattermost channel members visible to Campfire.',
			userIDs: roles.memberUserIds,
			tone: 'slate',
		},
		{
			title: 'Leads',
			description: 'Users allowed to manage workspace settings.',
			userIDs: roles.leadUserIds,
			tone: 'ember',
		},
		{
			title: 'Approvers',
			description: 'Users allowed to approve or reject leave requests.',
			userIDs: roles.approverUserIds,
			tone: 'green',
		},
		{
			title: 'Admins',
			description: 'Explicit workspace admins.',
			userIDs: roles.adminUserIds,
			tone: 'green',
		},
		{
			title: 'Viewers',
			description: 'Users with report visibility only.',
			userIDs: roles.viewerUserIds,
			tone: 'slate',
		},
	];
}

/**
 * collectRoleUserIDs returns every user ID referenced by the role overview.
 */
function collectRoleUserIDs(roles: WorkspaceRoleOverview | null): readonly string[] {
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
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load workspace roles.';
}
