import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { RoleAssignmentPanel } from './RoleAssignmentPanel';
import { RoleBehaviorPanel } from './RoleBehaviorPanel';
import { RoleGroupsPanel } from './RoleGroupsPanel';
import { RolesAccessFeedback, RolesAccessLoading } from './RolesAccessFeedback';
import { RolesAccessHero } from './RolesAccessHero';
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

	return (
		<div className="cf:grid cf:gap-5">
			<RolesAccessHero
				roles={access.roles}
				isSystemAdmin={props.isSystemAdmin}
				profilesLoading={profiles.loading}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<RolesAccessFeedback
						state={access.loadState}
						message={access.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					{access.loadState === 'loading' && <RolesAccessLoading />}

					{access.loadState !== 'loading' && access.roles !== null && (
						<>
							<RoleBehaviorPanel settings={access.roles.settings} />

							<RoleAssignmentPanel
								draft={access.assignmentDraft}
								disabled={access.isBusy}
								canManageRoles={canManageRoles}
								saving={access.savingKey === 'assign-role'}
								onDraftChange={access.updateAssignmentDraft}
								onAssign={access.assignRole}
							/>

							<RoleGroupsPanel
								groups={access.roleGroups}
								canManageRoles={canManageRoles}
								savingKey={access.savingKey}
								labelForUserID={profiles.labelForUserID}
								onRemoveRole={access.removeRole}
							/>
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
