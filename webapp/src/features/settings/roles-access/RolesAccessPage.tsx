import type { ReactElement } from 'react';
import { Crown, ShieldCheck, UserCog, UsersRound } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { RoleAssignmentPanel } from './RoleAssignmentPanel';
import { RoleBehaviorPanel } from './RoleBehaviorPanel';
import { RoleGroupsPanel } from './RoleGroupsPanel';
import { RoleModelExplainer } from './RoleModelExplainer';
import { RolesAccessFeedback, RolesAccessLoading } from './RolesAccessFeedback';
import { useRolesAccess } from './useRolesAccess';

/**
 * RolesAccessPage renders effective workspace role access and assignment controls.
 */
export function RolesAccessPage(props: WorkspaceShellProps): ReactElement {
	const canManageRoles = props.capabilities.canManageWorkspace || props.isSystemAdmin;

	const access = useRolesAccess({
		workspace: props.workspace,
		canManageRoles,
	});

	const profiles = useUserProfiles(access.userIDsForProfiles);
	const namedRoleCount = access.roleGroups.reduce((count, group) => count + group.userIDs.length, 0);
	const leadCount = access.roleGroups.find(group => group.id === 'lead')?.userIDs.length ?? 0;
	const approverCount = access.roleGroups.find(group => group.id === 'approver')?.userIDs.length ?? 0;

	return (
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={ShieldCheck}
					label="Access mode"
					value={canManageRoles ? 'Editable' : 'Read only'}
					helper={props.isSystemAdmin ? 'System admin' : 'Workspace capability'}
					tone={canManageRoles ? 'green' : 'slate'}
				/>
				<CampfireStatCard icon={Crown} label="Leads" value={String(leadCount)} helper="Workspace operators" />
				<CampfireStatCard
					icon={UserCog}
					label="Approvers"
					value={String(approverCount)}
					helper="Can decide leave"
				/>
				<CampfireStatCard
					icon={UsersRound}
					label="Named roles"
					value={String(namedRoleCount)}
					helper={profiles.loading ? 'Loading profiles' : 'Explicit assignments'}
				/>
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Roles & access</p>
						<h3 className="campfire-surface-title">Role model and named access</h3>
						<p className="campfire-surface-description">
							Review inherited Mattermost rules, assign named Campfire roles, and remove explicit assignments
							from one focused workspace.
						</p>
					</div>
					<ShieldCheck className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<RolesAccessFeedback
					state={access.loadState}
					message={access.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				{access.loadState === 'loading' && <RolesAccessLoading />}
			</CampfireSurface>

			<RoleModelExplainer />

			{access.loadState !== 'loading' && access.roles !== null && (
				<>
					<div className="campfire-settings-split campfire-settings-split--roles">
						<RoleBehaviorPanel settings={access.roles.settings} />

						<RoleAssignmentPanel
							workspaceID={props.workspace.id}
							draft={access.assignmentDraft}
							disabled={access.isBusy}
							canManageRoles={canManageRoles}
							saving={access.savingKey === 'assign-role'}
							onDraftChange={access.updateAssignmentDraft}
							onAssign={access.assignRole}
						/>
					</div>

					<RoleGroupsPanel
						groups={access.roleGroups}
						canManageRoles={canManageRoles}
						savingKey={access.savingKey}
						labelForUserID={profiles.labelForUserID}
						onRemoveRole={access.removeRole}
					/>
				</>
			)}
		</div>
	);
}
