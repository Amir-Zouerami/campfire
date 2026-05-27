import type { ReactElement } from 'react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TeamLeaveApprovalQueue } from './TeamLeaveApprovalQueue';
import { TeamLeaveApprovalsFeedback, TeamLeaveApprovalsLoading } from './TeamLeaveApprovalsFeedback';
import { TeamLeaveApprovalsHero } from './TeamLeaveApprovalsHero';
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
 * TeamLeaveApprovalsPage renders the rewritten Team Review approval inbox.
 */
export function TeamLeaveApprovalsPage(props: TeamLeaveApprovalsPageProps): ReactElement | null {
	const approvals = useTeamLeaveApprovals(props);
	const profiles = useUserProfiles(approvals.userIDsForProfiles);

	if (approvals.loadState === 'hidden') {
		return null;
	}

	return (
		<div className="cf:grid cf:gap-5">
			<TeamLeaveApprovalsHero pendingCount={approvals.pendingCount} profilesLoading={profiles.loading} />

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
