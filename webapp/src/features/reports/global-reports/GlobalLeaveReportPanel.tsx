import type { ReactElement } from 'react';
import { CalendarCheck2, Globe2, Hourglass, Umbrella } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireEmpty, CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={CalendarCheck2}
					label="Approved"
					value={String(report.summary?.approvedCount ?? 0)}
					helper="Accepted leave"
					tone="green"
				/>
				<CampfireStatCard
					icon={Hourglass}
					label="Pending"
					value={String(report.summary?.pendingCount ?? 0)}
					helper="Awaiting decisions"
				/>
				<CampfireStatCard
					icon={Globe2}
					label="Workspaces"
					value={String(report.summary?.workspaceCount ?? 0)}
					helper="With leave rows"
					tone="blue"
				/>
				<CampfireStatCard
					icon={Umbrella}
					label="Profiles"
					value={profiles.loading ? 'Loading' : 'Ready'}
					helper="User labels"
					tone="green"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Global leave</p>
						<h3 className="campfire-surface-title">System-wide leave controls</h3>
						<p className="campfire-surface-description">Load and export approved and pending leave across workspaces.</p>
					</div>
				</header>

				<GlobalReportsFeedback
					state={report.loadState}
					message={report.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<GlobalLeaveControls
					range={report.range}
					disabled={report.isBusy}
					onChange={report.updateRange}
					onLoad={report.loadReport}
					onExport={report.exportCSV}
				/>
			</CampfireSurface>

			{report.loadState === 'loading' || report.loadState === 'exporting' ? <GlobalReportsLoading /> : null}

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
