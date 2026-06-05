import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';

import { GlobalLeaveBreakdownPanel } from './GlobalLeaveBreakdownPanel';
import { GlobalLeaveControls } from './GlobalLeaveControls';
import { GlobalLeaveRowsPanel } from './GlobalLeaveRowsPanel';
import { GlobalReportsFeedback, GlobalReportsLoading } from './GlobalReportsFeedback';
import { useGlobalLeaveReport } from './useGlobalLeaveReport';

/**
 * GlobalLeaveReportPanelProps contains global leave access state.
 */
type GlobalLeaveReportPanelProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * GlobalLeaveReportPanel renders global leave reports across workspaces.
 */
export function GlobalLeaveReportPanel(props: GlobalLeaveReportPanelProps): ReactElement {
	const report = useGlobalLeaveReport(props.isSystemAdmin);
	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfirePageIntro
				eyebrow="Global leave"
				title="Cross-workspace leave"
				description="Load approved and pending leave across active Campfire workspaces."
			/>

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Global leave range"
				description="Choose the date range for leave rows and breakdowns."
				controls={(
					<GlobalLeaveControls
						range={report.range}
						disabled={report.isBusy}
						onChange={report.updateRange}
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
						{ label: 'Approved', value: String(report.summary.approvedCount), tone: 'success' },
						{ label: 'Pending', value: String(report.summary.pendingCount), tone: report.summary.pendingCount > 0 ? 'warning' : 'neutral' },
						{ label: 'Workspaces', value: String(report.summary.workspaceCount), tone: 'neutral' },
					]}
				/>
			)}

			{report.loadState !== 'loading' && report.summary === null && (
				<CampfireEmpty
					icon={Umbrella}
					title="No global leave report loaded"
					description="Choose a date range and load the global leave report."
				/>
			)}

			{report.loadState !== 'loading' && report.summary !== null && (
				<div className="campfire-page-stack">
					<GlobalLeaveBreakdownPanel workspaces={report.summary.workspaces} types={report.summary.types} />

					<GlobalLeaveRowsPanel rows={report.summary.rows} labelForUserID={profiles.labelForUserID} />
				</div>
			)}
		</div>
	);
}
