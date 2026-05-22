import type { ReactElement } from 'react';
import { Clock3, Globe2, Rows3, Users } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';

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
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Global reports"
					title="Global time report"
					description="System-wide time visibility across active workspaces."
					icon={Globe2}
					action={
						<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
							{props.isSystemAdmin ? 'System admin' : 'No global access'}
						</CampfireStatusPill>
					}
				/>

				<CampfireCardBody className="campfire-context-grid">
					<CampfireMetric
						label="Total time"
						value={formatMinutes(report.summary?.totalMinutes ?? 0)}
						helper="Selected range"
						icon={Clock3}
					/>
					<CampfireMetric
						label="Entries"
						value={String(report.summary?.entryCount ?? 0)}
						helper="Time logs"
						icon={Rows3}
					/>
					<CampfireMetric
						label="Workspaces"
						value={String(report.summary?.workspaceCount ?? 0)}
						helper="Active workspaces"
						icon={Globe2}
					/>
					<CampfireMetric
						label="Group by"
						value={formatGroupBy(report.filter.groupBy)}
						helper={profiles.loading ? 'Profiles loading' : 'Profiles ready'}
						icon={Users}
					/>
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
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

					{report.loadState === 'loading' || report.loadState === 'exporting' ? (
						<GlobalReportsLoading />
					) : null}

					{report.loadState !== 'loading' && report.summary === null && (
						<CampfireEmpty
							icon={Globe2}
							title="No global time report loaded"
							description="Choose a date range and load the global time report."
						/>
					)}

					{report.loadState !== 'loading' && report.summary !== null && (
						<div className="cf:grid cf:gap-5">
							<GlobalTimeWorkspacePanel workspaces={report.summary.workspaces} />

							<GlobalTimeRowsPanel
								groupBy={report.summary.groupBy}
								rows={report.summary.rows}
								labelForUserID={profiles.labelForUserID}
							/>
						</div>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
