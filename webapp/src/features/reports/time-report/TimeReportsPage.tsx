import type { ReactElement } from 'react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { TimeReportControls } from './TimeReportControls';
import { TimeReportFeedback, TimeReportLoading } from './TimeReportFeedback';
import { formatMinutes } from './time-report.helpers';
import { timeReportGroupByLabel } from './time-report.i18n';
import { TimeReportRowsPanel } from './TimeReportRowsPanel';
import { useTimeReport } from './useTimeReport';

/**
 * TimeReportsPageProps contains workspace context for report loading.
 */
type TimeReportsPageProps = {
	readonly workspace: Workspace;
};

/**
 * TimeReportsPage renders the workspace time report workflow.
 */
export function TimeReportsPage(props: TimeReportsPageProps): ReactElement {
	const { t } = useI18n();
	const report = useTimeReport({
		workspace: props.workspace,
	});

	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfireControlsPanel
				eyebrow={t('reports.time.controls.eyebrow')}
				title={t('reports.time.controls.title')}
				description={t('reports.time.controls.description')}
				controls={(
					<TimeReportControls
						filter={report.filter}
						disabled={report.isBusy}
						timezone={props.workspace.timezone}
						onChange={report.updateFilter}
						onLoad={report.loadReport}
					/>
				)}
			>
				<TimeReportFeedback state={report.loadState} message={report.message} profileErrorMessage={profiles.errorMessage} />
			</CampfireControlsPanel>

			{report.loadState === 'loading' && <TimeReportLoading />}

			{report.summary !== null && (
				<CampfireReportSummaryBar
					items={[
						{ label: t('reports.time.summary.totalTime'), value: formatMinutes(report.totalMinutes), tone: 'success' },
						{ label: t('reports.time.summary.rows'), value: String(report.rowCount), tone: 'neutral' },
						{ label: t('reports.time.summary.entries'), value: String(report.entryCount), tone: 'neutral' },
						{ label: t('reports.time.summary.groupedBy'), value: timeReportGroupByLabel(report.filter.groupBy, t), tone: 'neutral' },
					]}
				/>
			)}

			{report.loadState !== 'loading' && report.summary !== null && (
				<TimeReportRowsPanel
					groupBy={report.summary.groupBy}
					rows={report.summary.rows}
					labelForUserID={profiles.labelForUserID}
				/>
			)}
		</div>
	);
}
