import type { ReactElement } from 'react';
import { Crown, ShieldCheck, UserCog, UsersRound } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';

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
	const { t } = useI18n();
	const canManageRoles = props.capabilities.canManageWorkspace || props.isSystemAdmin;

	const access = useRolesAccess({
		workspace: props.workspace,
		canManageRoles,
	});

	const profiles = useUserProfiles(access.userIDsForProfiles);
	const namedRoleCount = access.roleGroups.reduce((count, group) => {
		return group.removable ? count + group.userIDs.length : count;
	}, 0);
	const leadCount = access.roleGroups.find(group => group.id === 'leads')?.userIDs.length ?? 0;
	const approverCount = access.roleGroups.find(group => group.id === 'approvers')?.userIDs.length ?? 0;
	const excludedCount = access.roleGroups.find(group => group.id === 'excluded')?.userIDs.length ?? 0;
	const shouldShowStatusSurface = access.loadState === 'loading'
		|| access.loadState === 'error'
		|| access.message.trim() !== ''
		|| profiles.errorMessage.trim() !== '';

	return (
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={ShieldCheck}
					label={t('settings.roles.stats.accessMode.label')}
					value={canManageRoles ? t('settings.roles.status.editable') : t('settings.roles.status.readOnly')}
					helper={props.isSystemAdmin ? t('settings.roles.stats.accessMode.systemAdmin') : t('settings.roles.stats.accessMode.capability')}
					tone={canManageRoles ? 'green' : 'slate'}
				/>
				<CampfireStatCard
					icon={Crown}
					label={t('settings.roles.stats.leads.label')}
					value={String(leadCount)}
					helper={t('settings.roles.stats.leads.helper')}
				/>
				<CampfireStatCard
					icon={UserCog}
					label={t('settings.roles.stats.approvers.label')}
					value={String(approverCount)}
					helper={t('settings.roles.stats.approvers.helper')}
				/>
				<CampfireStatCard
					icon={UsersRound}
					label={t('settings.roles.stats.excluded.label')}
					value={String(excludedCount)}
					helper={
						profiles.loading
							? t('settings.roles.stats.excluded.loading')
							: t('settings.roles.stats.excluded.helper', { count: String(namedRoleCount) })
					}
				/>
			</div>

			<CampfirePageIntro
				eyebrow={t('settings.roles.page.eyebrow')}
				title={t('settings.roles.page.title')}
				description={t('settings.roles.page.description')}
				actions={<ShieldCheck className="cf:size-5" aria-hidden="true" />}
			/>

			{shouldShowStatusSurface && (
				<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
					<RolesAccessFeedback
						state={access.loadState}
						message={access.message}
						messageTone={access.messageTone}
						profileErrorMessage={profiles.errorMessage}
					/>

					{access.loadState === 'loading' && <RolesAccessLoading />}
				</CampfireSurface>
			)}

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
