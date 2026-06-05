import type { ReactElement } from 'react';
import { ClipboardCheck } from 'lucide-react';

import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
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
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfireSettingsPanel
				icon={ClipboardCheck}
				title="Leave approval queue"
				description="Review pending leave requests and record a clear approval or rejection decision."
				className="campfire-team-review-panel"
			>
				<CampfireReportSummaryBar
					items={[
						{ label: 'Pending', value: String(approvals.pendingCount), tone: approvals.pendingCount > 0 ? 'warning' : 'success' },
						{ label: 'Decision notes', value: 'Supported' },
						{ label: 'Profiles', value: profiles.loading ? 'Loading' : 'Ready' },
					]}
				/>
			</CampfireSettingsPanel>

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
		</div>
	);
}
