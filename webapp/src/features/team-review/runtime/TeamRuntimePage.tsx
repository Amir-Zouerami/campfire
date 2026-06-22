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
							value: runtimeDecisionLabel(runtime.decision, t),
							tone: runtime.decision?.shouldRun === false ? 'danger' : 'success',
						},
						{
							label: t('teamReview.runtime.summary.reason'),
							value: runtime.decision === null
								? t('teamReview.runtime.decision.notEvaluated')
								: runtimeReasonLabel(runtime.decision.reason, t),
						},
						{ label: t('teamReview.runtime.summary.participants'), value: String(runtime.decision?.memberCount ?? 0) },
						{ label: t('teamReview.runtime.summary.onLeave'), value: String(runtime.decision?.onLeaveMemberCount ?? 0) },
						{ label: t('teamReview.runtime.summary.excluded'), value: String(runtime.decision?.excludedMemberCount ?? 0) },
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
