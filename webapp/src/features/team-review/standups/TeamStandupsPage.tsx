import type { ReactElement } from 'react';
import { ClipboardList } from 'lucide-react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useUserProfiles } from '@/app/useUserProfiles';
import { useI18n } from '@/i18n';
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
	const { t } = useI18n();
	const standups = useTeamStandups(props);
	const profiles = useUserProfiles(standups.userIDsForProfiles);
	const memberCount = standups.summary?.memberUserIds.length ?? 0;
	const submittedCount = standups.summary?.submittedUserIds.length ?? 0;
	const missingCount = standups.summary?.missingUserIds.length ?? 0;
	const onLeaveCount = standups.summary?.onLeaveUserIds.length ?? 0;
	const excludedCount = standups.summary?.excludedUserIds.length ?? 0;

	return (
		<div className="campfire-team-standups-page campfire-team-review-clean-page">
			<CampfireControlsPanel
				eyebrow={t('teamReview.standups.filters.eyebrow')}
				title={t('teamReview.standups.filters.title')}
				description={t('teamReview.standups.filters.description')}
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
						{ label: t('teamReview.standups.summary.participants'), value: String(memberCount) },
						{ label: t('teamReview.standups.summary.excluded'), value: String(excludedCount) },
						{ label: t('teamReview.standups.summary.submitted'), value: String(submittedCount), tone: 'success' },
						{ label: t('teamReview.standups.summary.missing'), value: String(missingCount), tone: missingCount > 0 ? 'danger' : 'neutral' },
						{ label: t('teamReview.standups.summary.onLeave'), value: String(onLeaveCount) },
						{ label: t('teamReview.standups.summary.complete'), value: `${standups.submittedPercent}%`, tone: standups.submittedPercent >= 80 ? 'success' : 'warning' },
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
						excludedUserIDs={standups.summary.excludedUserIds}
						labelForUserID={profiles.labelForUserID}
					/>

					<CampfireSettingsPanel
						icon={ClipboardList}
						title={t('teamReview.standups.submissions.title')}
						description={t('teamReview.standups.submissions.description')}
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
