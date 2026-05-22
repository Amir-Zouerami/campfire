import type { ReactElement } from 'react';
import { Crown, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { WorkspaceRoleOverview } from '@/types/domain';

/**
 * RolesAccessHeroProps contains role overview metrics.
 */
type RolesAccessHeroProps = {
	readonly roles: WorkspaceRoleOverview | null;
	readonly isSystemAdmin: boolean;
	readonly profilesLoading: boolean;
};

/**
 * RolesAccessHero renders the roles/access page header.
 */
export function RolesAccessHero(props: RolesAccessHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Roles & Access"
				title="Effective workspace access"
				description="Review who can manage the workspace, approve leave, view reports, or use member workflows."
				icon={ShieldCheck}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'Workspace scoped'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Members"
					value={String(props.roles?.memberUserIds.length ?? 0)}
					helper="Channel users"
					icon={UsersRound}
				/>
				<CampfireMetric
					label="Leads"
					value={String(props.roles?.leadUserIds.length ?? 0)}
					helper="Workspace managers"
					icon={Crown}
				/>
				<CampfireMetric
					label="Approvers"
					value={String(props.roles?.approverUserIds.length ?? 0)}
					helper="Leave decisions"
					icon={UserCheck}
				/>
				<CampfireMetric
					label="Profiles"
					value={props.profilesLoading ? 'Loading' : 'Ready'}
					helper="User labels"
					icon={ShieldCheck}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
