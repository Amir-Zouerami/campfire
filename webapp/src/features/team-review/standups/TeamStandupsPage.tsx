import type { ReactElement } from 'react';
import { ClipboardList } from 'lucide-react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
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
	const memberCount = standups.summary?.memberUserIds.length ?? 0;
	const submittedCount = standups.summary?.submittedUserIds.length ?? 0;
	const missingCount = standups.summary?.missingUserIds.length ?? 0;
	const onLeaveCount = standups.summary?.onLeaveUserIds.length ?? 0;

	return (
		<div className="campfire-team-standups-page campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow="Review filters"
				title="Choose the standup occurrence"
				description="Review one date at a time. People who submitted, missed, or were on approved leave are separated below."
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
			>
				<CampfireReportSummaryBar
					items={[
						{ label: 'Members', value: String(memberCount) },
						{ label: 'Submitted', value: String(submittedCount), tone: 'success' },
						{ label: 'Missing', value: String(missingCount), tone: missingCount > 0 ? 'danger' : 'neutral' },
						{ label: 'On leave', value: String(onLeaveCount) },
						{ label: 'Complete', value: `${standups.submittedPercent}%`, tone: standups.submittedPercent >= 80 ? 'success' : 'warning' },
					]}
				/>
			</CampfireControlsPanel>

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

					<CampfireSettingsPanel
						icon={ClipboardList}
						title="Submitted standups"
						description="Answers and blockers for the selected occurrence date."
						className="campfire-team-review-panel"
					>
						<TeamStandupSubmissionList
							submissions={standups.summary.submissions}
							questionsByID={standups.questionsByID}
							labelForUserID={profiles.labelForUserID}
						/>
					</CampfireSettingsPanel>
				</>
			)}
		</div>
	);
}
