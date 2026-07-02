import { useMemo } from 'react';
import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useUserProfiles } from '@/app/useUserProfiles';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { collectAvailabilityUserIDs } from './team-availability.helpers';
import { TeamAvailabilityFeedback, TeamAvailabilityLoading } from './TeamAvailabilityFeedback';
import { TeamAvailabilityRangeControls } from './TeamAvailabilityRangeControls';
import { TeamAvailabilitySummaryPanel } from './TeamAvailabilitySummaryPanel';
import { TeamAvailabilityTablePanel } from './TeamAvailabilityTablePanel';
import { useTeamAvailability } from './useTeamAvailability';

/**
 * TeamAvailabilityPageProps contains workspace context and refresh behavior.
 */
type TeamAvailabilityPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * TeamAvailabilityPage renders one focused availability planning workspace.
 */
export function TeamAvailabilityPage(props: TeamAvailabilityPageProps): ReactElement {
	const { t } = useI18n();
	const availability = useTeamAvailability(props);

	const userIDsForProfiles = useMemo(() => {
		return collectAvailabilityUserIDs(availability.leaveRequests);
	}, [availability.leaveRequests]);

	const profiles = useUserProfiles(userIDsForProfiles);
	const loadingSummaryValue = t('common.loading');
	const todayLeaveCount = availability.loadState === 'loading' ? loadingSummaryValue : String(availability.todayLeaves.length);
	const weekLeaveCount = availability.loadState === 'loading' ? loadingSummaryValue : String(availability.weekLeaves.length);
	const selectedRangeCount = availability.loadState === 'loading' ? loadingSummaryValue : String(availability.leaveRequests.length);
	const selectedRangeTone = availability.loadState === 'loading' ? 'neutral' : availability.leaveRequests.length > 0 ? 'success' : 'neutral';

	return (
		<div className="campfire-team-workflow campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow={t('teamReview.availability.controls.eyebrow')}
				title={t('teamReview.availability.controls.title')}
				description={t('teamReview.availability.controls.description')}
				controls={
					<TeamAvailabilityRangeControls
						range={availability.range}
						disabled={availability.isBusy}
						timezone={props.workspace.timezone}
						onChange={availability.updateRange}
					/>
				}
			>
				<CampfireReportSummaryBar
					items={[
						{ label: t('teamReview.availability.summary.today'), value: todayLeaveCount },
						{ label: t('teamReview.availability.summary.thisWeek'), value: weekLeaveCount },
						{ label: t('teamReview.availability.summary.selectedRange'), value: selectedRangeCount, tone: selectedRangeTone },
						{ label: t('teamReview.availability.summary.profiles'), value: profiles.loading ? t('common.loading') : t('common.ready') },
					]}
				/>
			</CampfireControlsPanel>

			<TeamAvailabilityFeedback
				state={availability.loadState}
				message={availability.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{availability.loadState === 'loading' && <TeamAvailabilityLoading />}

			{availability.loadState !== 'loading' && (
				<>
					<div className="campfire-team-detail-grid campfire-team-detail-grid--flat">
						<TeamAvailabilitySummaryPanel
							title={t('teamReview.availability.summary.today')}
							description={t('teamReview.availability.panel.todayDescription')}
							rows={availability.todayLeaves}
							labelForUserID={profiles.labelForUserID}
						/>

						<TeamAvailabilitySummaryPanel
							title={t('teamReview.availability.summary.thisWeek')}
							description={t('teamReview.availability.panel.weekDescription')}
							rows={availability.weekLeaves}
							labelForUserID={profiles.labelForUserID}
						/>
					</div>

					<TeamAvailabilityTablePanel
						rows={availability.leaveRequests}
						timezone={props.workspace.timezone}
						workingDays={props.workspace.workingDays}
						disabled={availability.isBusy}
						labelForUserID={profiles.labelForUserID}
						onEditLeaveRequest={availability.editLeaveRequest}
						onCancelLeaveRequest={availability.cancelLeaveRequestByID}
					/>
				</>
			)}
		</div>
	);
}
