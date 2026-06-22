import type { ReactElement } from 'react';
import { ClipboardCheck } from 'lucide-react';

import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useUserProfiles } from '@/app/useUserProfiles';
import { useI18n } from '@/i18n';
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
	const { t } = useI18n();
	const approvals = useTeamLeaveApprovals(props);
	const profiles = useUserProfiles(approvals.userIDsForProfiles);

	if (approvals.loadState === 'hidden') {
		return null;
	}

	return (
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfirePageIntro
				eyebrow={t('teamReview.sections.approvals.label')}
				title={t('teamReview.approvals.panel.title')}
				description={t('teamReview.approvals.panel.description')}
				actions={<ClipboardCheck className="cf:size-5" aria-hidden="true" />}
			/>

			<CampfireReportSummaryBar
				items={[
					{ label: t('teamReview.approvals.summary.pending'), value: String(approvals.pendingCount), tone: approvals.pendingCount > 0 ? 'warning' : 'success' },
					{ label: t('teamReview.approvals.summary.editRequests'), value: String(approvals.changeRequests.length), tone: approvals.changeRequests.length > 0 ? 'warning' : 'neutral' },
					{ label: t('teamReview.approvals.summary.profiles'), value: profiles.loading ? t('common.loading') : t('common.ready') },
				]}
			/>

			<TeamLeaveApprovalsFeedback
				state={approvals.loadState}
				message={approvals.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{approvals.loadState === 'loading' && <TeamLeaveApprovalsLoading />}

			{approvals.loadState !== 'idle' && approvals.loadState !== 'loading' && (
				<TeamLeaveApprovalQueue
					leaveRequests={approvals.leaveRequests}
					changeRequests={approvals.changeRequests}
					comments={approvals.comments}
					disabled={approvals.isBusy}
					labelForUserID={profiles.labelForUserID}
					onCommentChange={approvals.updateComment}
					timezone={props.workspace.timezone}
					onDecision={approvals.decide}
					onChangeDecision={approvals.decideChange}
					onCancel={approvals.cancelLeaveRequestByID}
				/>
			)}

			{approvals.loadState === 'error' && approvals.leaveRequests.length === 0 && (
				<CampfireEmpty
					title={t('teamReview.approvals.empty.error.title')}
					description={t('teamReview.approvals.empty.error.description')}
				/>
			)}
		</div>
	);
}
