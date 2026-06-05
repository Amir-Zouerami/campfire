import { useMemo } from 'react';
import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
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
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow="Availability window"
				title="Pick the leave range"
				description="Review approved leave for today, this week, or any custom planning window."
				controls={
					<TeamAvailabilityRangeControls
						range={availability.range}
						disabled={availability.isBusy}
						timezone={props.workspace.timezone}
						onChange={availability.updateRange}
					/>
				}
			>
				<CampfireReportSummaryBar
					items={[
						{ label: 'Today', value: String(availability.todayLeaves.length) },
						{ label: 'This week', value: String(availability.weekLeaves.length) },
						{ label: 'Selected range', value: String(availability.leaveRequests.length), tone: availability.leaveRequests.length > 0 ? 'success' : 'neutral' },
						{ label: 'Profiles', value: profiles.loading ? 'Loading' : 'Ready' },
					]}
				/>
			</CampfireControlsPanel>

			<TeamAvailabilityFeedback
				state={availability.loadState}
				message={availability.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{availability.loadState === 'loading' && <TeamAvailabilityLoading />}

			{availability.loadState !== 'loading' && (
				<>
					<div className="campfire-team-detail-grid campfire-team-detail-grid--flat">
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
		</div>
	);
}
