import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { useUserProfiles } from './useUserProfiles';
import { ApiClientError, listWorkspaceRoles } from '../api/client';
import type { Role, Workspace, WorkspaceRoleOverview } from '../types/domain';

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

	return (
		<section className="cf:rounded-3xl cf:border cf:border-fuchsia-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-fuchsia-200">
						Members & roles
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Workspace roles
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						View the MVP role model for this workspace. Members come from the Mattermost channel; Leads,
						Approvers, Admins, and Viewers are Campfire role assignments.
					</p>
				</div>

				<span className="cf:w-fit cf:rounded-full cf:border cf:border-fuchsia-300/25 cf:bg-fuchsia-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-fuchsia-100">
					{props.isSystemAdmin ? 'System admin' : 'Workspace scoped'}
				</span>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}
			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-slate-300">Resolving user names…</p>
			)}

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-4 cf:text-slate-300">Loading roles…</p>}

			{roles !== null && (
				<>
					<div className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-2">
						<SettingTile
							label="Channel admins are Leads"
							value={roles.settings.channelAdminsAreLeads ? 'Enabled' : 'Disabled'}
						/>
						<SettingTile
							label="System admins are Admins"
							value={roles.settings.systemAdminsAreAdmins ? 'Enabled' : 'Disabled'}
						/>
					</div>

					<div className="cf:mt-5 cf:grid cf:gap-4 cf:xl:grid-cols-2">
						<RoleGroup
							description="Everyone in the Mattermost channel is treated as a workspace member."
							role="member"
							title="Members"
							userIDs={roles.memberUserIds}
							labelForUserID={labelForUserID}
						/>
						<RoleGroup
							description="Leads can manage workspace settings, standups, reports, and calendar settings."
							role="lead"
							title="Leads"
							userIDs={roles.leadUserIds}
							labelForUserID={labelForUserID}
						/>
						<RoleGroup
							description="Approvers can approve or reject leave requests."
							role="approver"
							title="Approvers"
							userIDs={roles.approverUserIds}
							labelForUserID={labelForUserID}
						/>
						<RoleGroup
							description="Admins can view global reports and global settings. System admins are implied."
							role="admin"
							title="Admins"
							userIDs={roles.adminUserIds}
							labelForUserID={labelForUserID}
						/>
						<RoleGroup
							description="Viewers are read-only report users for future report-focused workflows."
							role="viewer"
							title="Viewers"
							userIDs={roles.viewerUserIds}
							labelForUserID={labelForUserID}
						/>
					</div>
				</>
			)}
		</section>
	);
}

/**
 * SettingTile renders one role setting.
 */
function SettingTile(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<span className="cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-fuchsia-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-base cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * RoleGroup renders one workspace role group.
 */
function RoleGroup(props: {
	readonly role: Role;
	readonly title: string;
	readonly description: string;
	readonly userIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<div>
					<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">{props.title}</h3>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-slate-300">{props.description}</p>
				</div>

				<span className={rolePillClassName(props.role)}>{props.userIDs.length}</span>
			</div>

			<div className="cf:mt-4 cf:flex cf:flex-wrap cf:gap-2">
				{props.userIDs.length === 0 && (
					<span className="cf:text-sm cf:font-bold cf:text-slate-400">No explicit users.</span>
				)}

				{props.userIDs.map(userID => (
					<span
						className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:text-slate-100"
						key={`${props.role}:${userID}`}
						title={userID}
					>
						{props.labelForUserID(userID)}
					</span>
				))}
			</div>
		</article>
	);
}

/**
 * collectRoleUserIDs returns every user ID shown on the card.
 */
function collectRoleUserIDs(roles: WorkspaceRoleOverview | null): readonly string[] {
	if (roles === null) {
		return [];
	}

	return uniqueNonEmptyUserIDs([
		...roles.memberUserIds,
		...roles.leadUserIds,
		...roles.approverUserIds,
		...roles.adminUserIds,
		...roles.viewerUserIds,
	]);
}

/**
 * uniqueNonEmptyUserIDs trims and de-duplicates user IDs.
 */
function uniqueNonEmptyUserIDs(userIDs: readonly string[]): readonly string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const userID of userIDs) {
		const cleanUserID = userID.trim();

		if (cleanUserID === '' || seen.has(cleanUserID)) {
			continue;
		}

		seen.add(cleanUserID);
		result.push(cleanUserID);
	}

	return result;
}

/**
 * rolePillClassName returns the count badge style for one role.
 */
function rolePillClassName(role: Role): string {
	const baseClassName = 'cf:rounded-full cf:border cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold';

	switch (role) {
		case 'member':
			return `${baseClassName} cf:border-slate-300/20 cf:bg-slate-300/10 cf:text-slate-100`;

		case 'lead':
			return `${baseClassName} cf:border-orange-300/25 cf:bg-orange-300/10 cf:text-orange-100`;

		case 'approver':
			return `${baseClassName} cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:text-emerald-100`;

		case 'admin':
			return `${baseClassName} cf:border-red-300/25 cf:bg-red-300/10 cf:text-red-100`;

		case 'viewer':
			return `${baseClassName} cf:border-sky-300/25 cf:bg-sky-300/10 cf:text-sky-100`;
	}
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
