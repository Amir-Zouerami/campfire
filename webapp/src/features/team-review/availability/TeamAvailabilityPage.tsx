import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { CalendarDays, CalendarRange, Umbrella, Users } from 'lucide-react';

import { CampfireSurface, CampfireStatCard } from '@/components/campfire/CampfireLayoutPrimitives';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { collectAvailabilityUserIDs } from './team-availability.helpers';
import { TeamAvailabilityFeedback, TeamAvailabilityLoading } from './TeamAvailabilityFeedback';
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
 * TeamAvailabilityPage renders one focused availability planning workspace.
 */
export function TeamAvailabilityPage(props: TeamAvailabilityPageProps): ReactElement {
	const availability = useTeamAvailability(props);

	const userIDsForProfiles = useMemo(() => {
		return collectAvailabilityUserIDs(availability.leaveRequests);
	}, [availability.leaveRequests]);

	const profiles = useUserProfiles(userIDsForProfiles);

	return (
		<div className="campfire-team-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={CalendarDays} label="Today" value={String(availability.todayLeaves.length)} helper={availability.today} />
				<CampfireStatCard
					icon={CalendarRange}
					label="This week"
					value={String(availability.weekLeaves.length)}
					helper={`${availability.weekRange.startDate} → ${availability.weekRange.endDate}`}
					tone="blue"
				/>
				<CampfireStatCard
					icon={Umbrella}
					label="Selected range"
					value={String(availability.leaveRequests.length)}
					helper="Approved rows"
					tone="green"
				/>
				<CampfireStatCard
					icon={Users}
					label="Profiles"
					value={profiles.loading ? 'Loading' : 'Ready'}
					helper="User labels"
					tone="slate"
				/>
			</div>

			<CampfireSurface className="campfire-team-workflow-surface">
				<TeamAvailabilityFeedback
					state={availability.loadState}
					message={availability.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<TeamAvailabilityRangeControls
					range={availability.range}
					disabled={availability.isBusy}
					timezone={props.workspace.timezone}
					onChange={availability.updateRange}
				/>

				{availability.loadState === 'loading' && <TeamAvailabilityLoading />}

				{availability.loadState !== 'loading' && (
					<>
						<div className="campfire-team-detail-grid">
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
			</CampfireSurface>
		</div>
	);
}
