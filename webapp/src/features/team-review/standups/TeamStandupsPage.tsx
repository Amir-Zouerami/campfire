import type { ReactElement } from 'react';
import { ClipboardList, Percent, UserRoundCheck, UserRoundX, Users } from 'lucide-react';

import { CampfireStatCard, CampfireWorkflowIntro } from '@/components/campfire/CampfireLayoutPrimitives';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamStandupSubmissionList } from './TeamStandupSubmissionList';
import { TeamStandupsControls } from './TeamStandupsControls';
import { TeamStandupsFeedback, TeamStandupsLoading } from './TeamStandupsFeedback';
import { TeamStandupsAttentionStrip } from './TeamStandupsAttentionStrip';
import { useTeamStandups } from './useTeamStandups';

/**
 * TeamStandupsPageProps contains workspace context and refresh behavior.
 */
type TeamStandupsPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamStandupsPage renders one focused Team Review standup workspace.
 */
export function TeamStandupsPage(props: TeamStandupsPageProps): ReactElement {
	const standups = useTeamStandups(props);
	const profiles = useUserProfiles(standups.userIDsForProfiles);

	return (
		<div className="campfire-team-standups-page">
			<CampfireWorkflowIntro
				eyebrow="Review cockpit"
				title="One clean standup review"
				description="Pick the occurrence date, choose the review order, then scan missing people and submitted updates without nested cards."
				id="campfire-standup-review-title"
				controls={
					<TeamStandupsControls
						occurrenceDate={standups.occurrenceDate}
						sortMode={standups.sortMode}
						disabled={standups.isBusy}
						timezone={props.workspace.timezone}
						onOccurrenceDateChange={standups.setOccurrenceDate}
						onSortModeChange={standups.setSortMode}
					/>
				}
			/>

			<div className="campfire-stat-grid campfire-stat-grid--four campfire-standup-review-metrics">
				<CampfireStatCard
					icon={Users}
					label="Members"
					value={String(standups.summary?.memberUserIds.length ?? 0)}
					helper={standups.occurrenceDate}
				/>
				<CampfireStatCard
					icon={UserRoundCheck}
					label="Submitted"
					value={String(standups.summary?.submittedUserIds.length ?? 0)}
					helper="Completed check-ins"
					tone="green"
				/>
				<CampfireStatCard
					icon={UserRoundX}
					label="Missing"
					value={String(standups.summary?.missingUserIds.length ?? 0)}
					helper="Need follow-up"
					tone="red"
				/>
				<CampfireStatCard
					icon={Percent}
					label="Completion"
					value={`${standups.submittedPercent}%`}
					helper={profiles.loading ? 'Profiles loading' : 'Profiles ready'}
					tone="ember"
				/>
			</div>

			<TeamStandupsFeedback
				state={standups.loadState}
				message={standups.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{standups.loadState === 'loading' && <TeamStandupsLoading />}

			{standups.loadState !== 'loading' && standups.summary !== null && (
				<>
					<TeamStandupsAttentionStrip
						missingUserIDs={standups.summary.missingUserIds}
						onLeaveUserIDs={standups.summary.onLeaveUserIds}
						labelForUserID={profiles.labelForUserID}
					/>

					<section className="campfire-standup-review-submissions" aria-labelledby="campfire-submitted-standups-title">
						<div className="campfire-team-list-heading campfire-team-list-heading--flat">
							<ClipboardList className="campfire-flat-header-icon" />
							<div>
								<h3 id="campfire-submitted-standups-title">Submitted standups</h3>
								<p>Answers, blockers, and follow-up context for the selected occurrence date.</p>
							</div>
						</div>

						<TeamStandupSubmissionList
							submissions={standups.summary.submissions}
							questionsByID={standups.questionsByID}
							labelForUserID={profiles.labelForUserID}
						/>
					</section>
				</>
			)}
		</div>
	);
}
