import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamRuntimeControls } from './TeamRuntimeControls';
import { TeamRuntimeDecisionPanel } from './TeamRuntimeDecisionPanel';
import { TeamRuntimeFeedback, TeamRuntimeLoading } from './TeamRuntimeFeedback';
import { TeamRuntimeHero } from './TeamRuntimeHero';
import { TeamRuntimeLeavePanel } from './TeamRuntimeLeavePanel';
import { TeamRuntimeOffDaysPanel } from './TeamRuntimeOffDaysPanel';
import { useTeamRuntime } from './useTeamRuntime';

/**
 * TeamRuntimePageProps contains workspace context and refresh behavior.
 */
type TeamRuntimePageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamRuntimePage renders the rewritten Team Review runtime decision workspace.
 */
export function TeamRuntimePage(props: TeamRuntimePageProps): ReactElement {
	const runtime = useTeamRuntime(props);
	const profiles = useUserProfiles(runtime.userIDsForProfiles);

	return (
		<div className="cf:grid cf:gap-5">
			<TeamRuntimeHero date={runtime.date} decision={runtime.decision} profilesLoading={profiles.loading} />

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<TeamRuntimeFeedback
						state={runtime.loadState}
						message={runtime.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					<TeamRuntimeControls
						date={runtime.date}
						disabled={runtime.isBusy}
						onDateChange={runtime.setDate}
						onTodayClick={runtime.resetToToday}
					/>

					{runtime.loadState === 'loading' && <TeamRuntimeLoading />}

					{runtime.loadState !== 'loading' && runtime.decision !== null && (
						<>
							<TeamRuntimeDecisionPanel decision={runtime.decision} />

							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
								<TeamRuntimeOffDaysPanel
									globalOffDays={runtime.decision.globalOffDays}
									workspaceOffDays={runtime.decision.workspaceOffDays}
								/>

								<TeamRuntimeLeavePanel
									approvedLeaves={runtime.decision.approvedLeaves}
									labelForUserID={profiles.labelForUserID}
								/>
							</div>
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
