import type { ReactElement } from 'react';
import { CalendarCheck2, CalendarX2, Globe2, Umbrella, Users } from 'lucide-react';

import { CampfireSurface, CampfireStatCard } from '@/components/campfire/CampfireLayoutPrimitives';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamRuntimeControls } from './TeamRuntimeControls';
import { TeamRuntimeDecisionPanel } from './TeamRuntimeDecisionPanel';
import { TeamRuntimeFeedback, TeamRuntimeLoading } from './TeamRuntimeFeedback';
import { TeamRuntimeLeavePanel } from './TeamRuntimeLeavePanel';
import { TeamRuntimeOffDaysPanel } from './TeamRuntimeOffDaysPanel';
import { runtimeDecisionLabel, runtimeDecisionTone, runtimeReasonLabel } from './team-runtime.helpers';
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
	const DecisionIcon = runtime.decision?.shouldRun === false ? CalendarX2 : CalendarCheck2;
	const decisionTone = runtimeDecisionTone(runtime.decision);

	return (
		<div className="campfire-team-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={DecisionIcon}
					label="Decision"
					value={runtimeDecisionLabel(runtime.decision)}
					helper={runtime.decision === null ? runtime.date : runtimeReasonLabel(runtime.decision.reason)}
					tone={decisionTone}
				/>
				<CampfireStatCard
					icon={Users}
					label="Members"
					value={String(runtime.decision?.memberCount ?? 0)}
					helper="Workspace members"
				/>
				<CampfireStatCard
					icon={Umbrella}
					label="On leave"
					value={String(runtime.decision?.onLeaveMemberCount ?? 0)}
					helper="Approved leave"
					tone="blue"
				/>
				<CampfireStatCard
					icon={Globe2}
					label="Profiles"
					value={profiles.loading ? 'Loading' : 'Ready'}
					helper="Leave user labels"
					tone="slate"
				/>
			</div>

			<CampfireSurface className="campfire-team-workflow-surface">
				<TeamRuntimeFeedback
					state={runtime.loadState}
					message={runtime.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<TeamRuntimeControls
					date={runtime.date}
					disabled={runtime.isBusy}
					timezone={props.workspace.timezone}
					onDateChange={runtime.setDate}
					onTodayClick={runtime.resetToToday}
				/>

				{runtime.loadState === 'loading' && <TeamRuntimeLoading />}

				{runtime.loadState !== 'loading' && runtime.decision !== null && (
					<>
						<TeamRuntimeDecisionPanel decision={runtime.decision} />

						<div className="campfire-team-detail-grid">
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
			</CampfireSurface>
		</div>
	);
}
