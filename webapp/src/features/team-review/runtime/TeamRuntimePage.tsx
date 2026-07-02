import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useUserProfiles } from '@/app/useUserProfiles';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { TeamRuntimeControls } from './TeamRuntimeControls';
import { TeamRuntimeDecisionPanel } from './TeamRuntimeDecisionPanel';
import { TeamRuntimeFeedback, TeamRuntimeLoading } from './TeamRuntimeFeedback';
import { TeamRuntimeLeavePanel } from './TeamRuntimeLeavePanel';
import { TeamRuntimeOffDaysPanel } from './TeamRuntimeOffDaysPanel';
import { runtimeDecisionLabel, runtimeReasonLabel } from './team-runtime.i18n';
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
	const { t } = useI18n();
	const runtime = useTeamRuntime(props);
	const profiles = useUserProfiles(runtime.userIDsForProfiles);
	const loadingSummaryValue = t('common.loading');
	const decisionSummaryValue = runtime.loadState === 'loading' ? loadingSummaryValue : runtimeDecisionLabel(runtime.decision, t);
	const reasonSummaryValue = runtime.loadState === 'loading'
		? loadingSummaryValue
		: runtime.decision === null
			? t('teamReview.runtime.decision.notEvaluated')
			: runtimeReasonLabel(runtime.decision.reason, t);
	const participantSummaryValue = runtime.loadState === 'loading' ? loadingSummaryValue : String(runtime.decision?.memberCount ?? 0);
	const onLeaveSummaryValue = runtime.loadState === 'loading' ? loadingSummaryValue : String(runtime.decision?.onLeaveMemberCount ?? 0);
	const excludedSummaryValue = runtime.loadState === 'loading' ? loadingSummaryValue : String(runtime.decision?.excludedMemberCount ?? 0);
	const decisionSummaryTone = runtime.loadState === 'loading' ? 'neutral' : runtime.decision?.shouldRun === false ? 'danger' : 'success';

	return (
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow={t('teamReview.runtime.panel.eyebrow')}
				title={t('teamReview.runtime.panel.title')}
				description={t('teamReview.runtime.panel.description')}
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
						{
							label: t('teamReview.runtime.summary.decision'),
							value: decisionSummaryValue,
							tone: decisionSummaryTone,
						},
						{
							label: t('teamReview.runtime.summary.reason'),
							value: reasonSummaryValue,
						},
						{ label: t('teamReview.runtime.summary.participants'), value: participantSummaryValue },
						{ label: t('teamReview.runtime.summary.onLeave'), value: onLeaveSummaryValue },
						{ label: t('teamReview.runtime.summary.excluded'), value: excludedSummaryValue },
						{ label: t('teamReview.runtime.summary.profiles'), value: profiles.loading ? t('common.loading') : t('common.ready') },
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
