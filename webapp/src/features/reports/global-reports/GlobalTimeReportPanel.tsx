import type { ReactElement } from 'react';
import { Clock3, Globe2, Rows3, Users } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireEmpty, CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={Clock3}
					label="Total time"
					value={formatMinutes(report.summary?.totalMinutes ?? 0)}
					helper="Selected range"
				/>
				<CampfireStatCard icon={Rows3} label="Entries" value={String(report.summary?.entryCount ?? 0)} helper="Time logs" />
				<CampfireStatCard
					icon={Globe2}
					label="Workspaces"
					value={String(report.summary?.workspaceCount ?? 0)}
					helper="Active workspaces"
					tone="blue"
				/>
				<CampfireStatCard
					icon={Users}
					label="Group by"
					value={formatGroupBy(report.filter.groupBy)}
					helper={profiles.loading ? 'Profiles loading' : 'Profiles ready'}
					tone="green"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Global time</p>
						<h3 className="campfire-surface-title">System-wide time controls</h3>
						<p className="campfire-surface-description">Load and export time totals across active workspaces.</p>
					</div>
				</header>

				<GlobalReportsFeedback
					state={report.loadState}
					message={report.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<GlobalTimeControls
					filter={report.filter}
					disabled={report.isBusy}
					onChange={report.updateFilter}
					onLoad={report.loadReport}
					onExport={report.exportCSV}
				/>
			</CampfireSurface>

			{report.loadState === 'loading' || report.loadState === 'exporting' ? <GlobalReportsLoading /> : null}

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
