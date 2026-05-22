import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { RoleBehaviorPanel } from './RoleBehaviorPanel';
import { RoleGroupsPanel } from './RoleGroupsPanel';
import { RolesAccessFeedback, RolesAccessLoading } from './RolesAccessFeedback';
import { RolesAccessHero } from './RolesAccessHero';
import { RolesAssignmentNotice } from './RolesAssignmentNotice';
import { useRolesAccess } from './useRolesAccess';

/**
 * RolesAccessPage renders effective workspace role access.
 */
export function RolesAccessPage(props: WorkspaceShellProps): ReactElement {
	const access = useRolesAccess({
		workspace: props.workspace,
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
							<RolesAssignmentNotice />
							<RoleGroupsPanel groups={access.roleGroups} labelForUserID={profiles.labelForUserID} />
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
