import type { ReactElement } from 'react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import type { Workspace } from '@/types/domain';

import { TimeReportControls } from './TimeReportControls';
import { TimeReportFeedback, TimeReportLoading } from './TimeReportFeedback';
import { formatMinutes, formatTimeReportGroupBy } from './time-report.helpers';
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
	const report = useTimeReport({
		workspace: props.workspace,
	});

	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Time report filters"
				description="Choose a range and one grouping dimension."
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
						{ label: 'Total time', value: formatMinutes(report.totalMinutes), tone: 'success' },
						{ label: 'Rows', value: String(report.rowCount), tone: 'neutral' },
						{ label: 'Entries', value: String(report.entryCount), tone: 'neutral' },
						{ label: 'Grouped by', value: formatTimeReportGroupBy(report.filter.groupBy), tone: 'neutral' },
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
