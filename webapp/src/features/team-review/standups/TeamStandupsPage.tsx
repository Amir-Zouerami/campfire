import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamStandupSubmissionList } from './TeamStandupSubmissionList';
import { TeamStandupsControls } from './TeamStandupsControls';
import { TeamStandupsFeedback, TeamStandupsLoading } from './TeamStandupsFeedback';
import { TeamStandupsHero } from './TeamStandupsHero';
import { TeamStandupsPeoplePanel } from './TeamStandupsPeoplePanel';
import { useTeamStandups } from './useTeamStandups';

/**
 * TeamStandupsPageProps contains workspace context and refresh behavior.
 */
type TeamStandupsPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamStandupsPage renders the rewritten Team Review standup review workspace.
 */
export function TeamStandupsPage(props: TeamStandupsPageProps): ReactElement {
	const standups = useTeamStandups(props);
	const profiles = useUserProfiles(standups.userIDsForProfiles);

	return (
		<div className="cf:grid cf:gap-5">
			<TeamStandupsHero
				summary={standups.summary}
				submittedPercent={standups.submittedPercent}
				occurrenceDate={standups.occurrenceDate}
				profilesLoading={profiles.loading}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<TeamStandupsFeedback
						state={standups.loadState}
						message={standups.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					<TeamStandupsControls
						occurrenceDate={standups.occurrenceDate}
						sortMode={standups.sortMode}
						disabled={standups.isBusy}
						onOccurrenceDateChange={standups.setOccurrenceDate}
						onSortModeChange={standups.setSortMode}
					/>

					{standups.loadState === 'loading' && <TeamStandupsLoading />}

					{standups.loadState !== 'loading' && standups.summary !== null && (
						<>
							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
								<TeamStandupsPeoplePanel
									title="Missing"
									description="Need follow-up"
									userIDs={standups.summary.missingUserIds}
									emptyTitle="Nobody is missing"
									emptyDescription="Everyone expected has submitted or is on approved leave."
									tone="red"
									labelForUserID={profiles.labelForUserID}
								/>

								<TeamStandupsPeoplePanel
									title="On leave"
									description="Skipped from missing"
									userIDs={standups.summary.onLeaveUserIds}
									emptyTitle="Nobody is on leave"
									emptyDescription="Approved leave for this date will appear here."
									tone="slate"
									labelForUserID={profiles.labelForUserID}
								/>
							</div>

							<TeamStandupSubmissionList
								submissions={standups.summary.submissions}
								questionsByID={standups.questionsByID}
								labelForUserID={profiles.labelForUserID}
							/>
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
