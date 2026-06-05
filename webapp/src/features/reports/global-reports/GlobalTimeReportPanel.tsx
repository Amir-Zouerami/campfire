import type { ReactElement } from 'react';
import { Globe2 } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';

import { formatGroupBy, formatMinutes } from './global-reports.helpers';
import { GlobalReportsFeedback, GlobalReportsLoading } from './GlobalReportsFeedback';
import { GlobalTimeControls } from './GlobalTimeControls';
import { GlobalTimeRowsPanel } from './GlobalTimeRowsPanel';
import { GlobalTimeWorkspacePanel } from './GlobalTimeWorkspacePanel';
import { useGlobalTimeReport } from './useGlobalTimeReport';

/**
 * GlobalTimeReportPanelProps contains global time access state.
 */
type GlobalTimeReportPanelProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * GlobalTimeReportPanel renders global time reports across workspaces.
 */
export function GlobalTimeReportPanel(props: GlobalTimeReportPanelProps): ReactElement {
	const report = useGlobalTimeReport(props.isSystemAdmin);
	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfirePageIntro
				eyebrow="Global time"
				title="Cross-workspace time"
				description="System admins can load and export time totals across active Campfire workspaces."
			/>

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Global time filters"
				description="Choose a date range and grouping dimension."
				controls={(
					<GlobalTimeControls
						filter={report.filter}
						disabled={report.isBusy}
						onChange={report.updateFilter}
						onLoad={report.loadReport}
						onExport={report.exportCSV}
					/>
				)}
			>
				<GlobalReportsFeedback
					state={report.loadState}
					message={report.message}
					profileErrorMessage={profiles.errorMessage}
				/>
			</CampfireControlsPanel>

			{report.loadState === 'loading' || report.loadState === 'exporting' ? <GlobalReportsLoading /> : null}

			{report.summary !== null && (
				<CampfireReportSummaryBar
					items={[
						{ label: 'Total time', value: formatMinutes(report.summary.totalMinutes), tone: 'success' },
						{ label: 'Entries', value: String(report.summary.entryCount), tone: 'neutral' },
						{ label: 'Workspaces', value: String(report.summary.workspaceCount), tone: 'neutral' },
						{ label: 'Grouped by', value: formatGroupBy(report.filter.groupBy), tone: 'neutral' },
					]}
				/>
			)}

			{report.loadState !== 'loading' && report.summary === null && (
				<CampfireEmpty
					icon={Globe2}
					title="No global time report loaded"
					description="Choose a date range and load the global time report."
				/>
			)}

			{report.loadState !== 'loading' && report.summary !== null && (
				<div className="campfire-page-stack">
					<GlobalTimeWorkspacePanel workspaces={report.summary.workspaces} />

					<GlobalTimeRowsPanel
						groupBy={report.summary.groupBy}
						rows={report.summary.rows}
						labelForUserID={profiles.labelForUserID}
					/>
				</div>
			)}
		</div>
	);
}
