import type { ReactElement } from 'react';
import { ClipboardList, Percent, UserRoundCheck, UserRoundX, Users } from 'lucide-react';

import { CampfireSurface, CampfireStatCard } from '@/components/campfire/CampfireLayoutPrimitives';
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
		<div className="campfire-team-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
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
					tone="blue"
				/>
			</div>

			<CampfireSurface className="campfire-team-workflow-surface">
				<TeamStandupsFeedback
					state={standups.loadState}
					message={standups.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<TeamStandupsControls
					occurrenceDate={standups.occurrenceDate}
					sortMode={standups.sortMode}
					disabled={standups.isBusy}
					timezone={props.workspace.timezone}
					onOccurrenceDateChange={standups.setOccurrenceDate}
					onSortModeChange={standups.setSortMode}
				/>

				{standups.loadState === 'loading' && <TeamStandupsLoading />}

				{standups.loadState !== 'loading' && standups.summary !== null && (
					<>
						<TeamStandupsAttentionStrip
							missingUserIDs={standups.summary.missingUserIds}
							onLeaveUserIDs={standups.summary.onLeaveUserIds}
							labelForUserID={profiles.labelForUserID}
						/>

						<div className="campfire-team-list-heading">
							<ClipboardList className="campfire-flat-header-icon" />
							<div>
								<h3 className="cf:m-0 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
									Submitted standups
								</h3>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-medium cf:text-muted-foreground">
									One focused list for submissions, answers, blockers, and follow-up context.
								</p>
							</div>
						</div>

						<TeamStandupSubmissionList
							submissions={standups.summary.submissions}
							questionsByID={standups.questionsByID}
							labelForUserID={profiles.labelForUserID}
						/>
					</>
				)}
			</CampfireSurface>
		</div>
	);
}
