import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamRuntimeControls } from './TeamRuntimeControls';
import { TeamRuntimeDecisionPanel } from './TeamRuntimeDecisionPanel';
import { TeamRuntimeFeedback, TeamRuntimeLoading } from './TeamRuntimeFeedback';
import { TeamRuntimeLeavePanel } from './TeamRuntimeLeavePanel';
import { TeamRuntimeOffDaysPanel } from './TeamRuntimeOffDaysPanel';
import { runtimeDecisionLabel, runtimeReasonLabel } from './team-runtime.helpers';
import { useTeamRuntime } from './useTeamRuntime';

/**
 * TeamRuntimePageProps contains workspace context and refresh behavior.
 */
type TeamRuntimePageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamRuntimePage renders one focused runtime-decision workspace.
 */
export function TeamRuntimePage(props: TeamRuntimePageProps): ReactElement {
	const runtime = useTeamRuntime(props);
	const profiles = useUserProfiles(runtime.userIDsForProfiles);

	return (
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow="Runtime check"
				title="Evaluate one standup date"
				description="Check whether Campfire should run or skip standup automation for a specific date."
				controls={
					<TeamRuntimeControls
						date={runtime.date}
						disabled={runtime.isBusy}
						timezone={props.workspace.timezone}
						onDateChange={runtime.setDate}
						onTodayClick={runtime.resetToToday}
					/>
				}
			>
				<CampfireReportSummaryBar
					items={[
						{ label: 'Decision', value: runtimeDecisionLabel(runtime.decision), tone: runtime.decision?.shouldRun === false ? 'danger' : 'success' },
						{ label: 'Reason', value: runtime.decision === null ? 'Not evaluated' : runtimeReasonLabel(runtime.decision.reason) },
						{ label: 'Members', value: String(runtime.decision?.memberCount ?? 0) },
						{ label: 'On leave', value: String(runtime.decision?.onLeaveMemberCount ?? 0) },
						{ label: 'Profiles', value: profiles.loading ? 'Loading' : 'Ready' },
					]}
				/>
			</CampfireControlsPanel>

			<TeamRuntimeFeedback
				state={runtime.loadState}
				message={runtime.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{runtime.loadState === 'loading' && <TeamRuntimeLoading />}

			{runtime.loadState !== 'loading' && runtime.decision !== null && (
				<>
					<TeamRuntimeDecisionPanel decision={runtime.decision} />

					<div className="campfire-team-detail-grid campfire-team-detail-grid--flat">
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
		</div>
	);
}
