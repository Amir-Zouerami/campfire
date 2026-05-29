import type { ReactElement } from 'react';
import { ClipboardCheck, Hourglass, MessageSquare, Users } from 'lucide-react';

import { CampfireEmpty, CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamLeaveApprovalQueue } from './TeamLeaveApprovalQueue';
import { TeamLeaveApprovalsFeedback, TeamLeaveApprovalsLoading } from './TeamLeaveApprovalsFeedback';
import { useTeamLeaveApprovals } from './useTeamLeaveApprovals';

/**
 * TeamLeaveApprovalsPageProps contains workspace context and refresh behavior.
 */
type TeamLeaveApprovalsPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
	readonly onLeaveDecided: () => void;
};

/**
 * TeamLeaveApprovalsPage renders the focused Team Review approval inbox.
 */
export function TeamLeaveApprovalsPage(props: TeamLeaveApprovalsPageProps): ReactElement | null {
	const approvals = useTeamLeaveApprovals(props);
	const profiles = useUserProfiles(approvals.userIDsForProfiles);

	if (approvals.loadState === 'hidden') {
		return null;
	}

	return (
		<div className="campfire-team-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={Hourglass} label="Pending" value={String(approvals.pendingCount)} helper="Need a decision" />
				<CampfireStatCard
					icon={ClipboardCheck}
					label="Workflow"
					value="Approve / Reject"
					helper="Decision note preserved"
					tone="green"
				/>
				<CampfireStatCard
					icon={MessageSquare}
					label="Notes"
					value="Supported"
					helper="Reviewer comments"
					tone="blue"
				/>
				<CampfireStatCard
					icon={Users}
					label="Profiles"
					value={profiles.loading ? 'Loading' : 'Ready'}
					helper="Requester labels"
					tone="slate"
				/>
			</div>

			<CampfireSurface className="campfire-team-workflow-surface">
				<TeamLeaveApprovalsFeedback
					state={approvals.loadState}
					message={approvals.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				{approvals.loadState === 'loading' && <TeamLeaveApprovalsLoading />}

				{approvals.loadState !== 'idle' && approvals.loadState !== 'loading' && (
					<TeamLeaveApprovalQueue
						leaveRequests={approvals.leaveRequests}
						comments={approvals.comments}
						disabled={approvals.isBusy}
						labelForUserID={profiles.labelForUserID}
						onCommentChange={approvals.updateComment}
						timezone={props.workspace.timezone}
						onDecision={approvals.decide}
					/>
				)}

				{approvals.loadState === 'error' && approvals.leaveRequests.length === 0 && (
					<CampfireEmpty
						title="Approval queue unavailable"
						description="Campfire could not load pending leave requests. Try again after checking the API response."
					/>
				)}
			</CampfireSurface>
		</div>
	);
}
