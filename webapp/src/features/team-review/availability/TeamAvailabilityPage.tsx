import { useMemo } from 'react';
import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { collectAvailabilityUserIDs } from './team-availability.helpers';
import { TeamAvailabilityFeedback, TeamAvailabilityLoading } from './TeamAvailabilityFeedback';
import { TeamAvailabilityHero } from './TeamAvailabilityHero';
import { TeamAvailabilityRangeControls } from './TeamAvailabilityRangeControls';
import { TeamAvailabilitySummaryPanel } from './TeamAvailabilitySummaryPanel';
import { TeamAvailabilityTablePanel } from './TeamAvailabilityTablePanel';
import { useTeamAvailability } from './useTeamAvailability';

/**
 * TeamAvailabilityPageProps contains workspace context and refresh behavior.
 */
type TeamAvailabilityPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamAvailabilityPage renders the rewritten Team Review availability workspace.
 */
export function TeamAvailabilityPage(props: TeamAvailabilityPageProps): ReactElement {
	const availability = useTeamAvailability(props);

	const userIDsForProfiles = useMemo(() => {
		return collectAvailabilityUserIDs(availability.leaveRequests);
	}, [availability.leaveRequests]);

	const profiles = useUserProfiles(userIDsForProfiles);

	return (
		<div className="cf:grid cf:gap-5">
			<TeamAvailabilityHero
				today={availability.today}
				weekRange={availability.weekRange}
				todayCount={availability.todayLeaves.length}
				weekCount={availability.weekLeaves.length}
				rangeCount={availability.leaveRequests.length}
				profilesLoading={profiles.loading}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<TeamAvailabilityFeedback
						state={availability.loadState}
						message={availability.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					<TeamAvailabilityRangeControls
						range={availability.range}
						disabled={availability.isBusy}
						onChange={availability.updateRange}
					/>

					{availability.loadState === 'loading' && <TeamAvailabilityLoading />}

					{availability.loadState !== 'loading' && (
						<>
							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
								<TeamAvailabilitySummaryPanel
									title="Today"
									description="Out right now"
									rows={availability.todayLeaves}
									labelForUserID={profiles.labelForUserID}
								/>

								<TeamAvailabilitySummaryPanel
									title="This week"
									description="Weekly availability"
									rows={availability.weekLeaves}
									labelForUserID={profiles.labelForUserID}
								/>
							</div>

							<TeamAvailabilityTablePanel
								rows={availability.leaveRequests}
								timezone={props.workspace.timezone}
								labelForUserID={profiles.labelForUserID}
							/>
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
