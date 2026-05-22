import type { ReactElement } from 'react';
import { CalendarCheck2, Globe2, Hourglass, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';

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
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Global reports"
					title="Global leave report"
					description="System-wide leave visibility across active workspaces."
					icon={Umbrella}
					action={
						<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
							{props.isSystemAdmin ? 'System admin' : 'No global access'}
						</CampfireStatusPill>
					}
				/>

				<CampfireCardBody className="campfire-context-grid">
					<CampfireMetric
						label="Approved"
						value={String(report.summary?.approvedCount ?? 0)}
						helper="Accepted leave"
						icon={CalendarCheck2}
					/>
					<CampfireMetric
						label="Pending"
						value={String(report.summary?.pendingCount ?? 0)}
						helper="Awaiting decisions"
						icon={Hourglass}
					/>
					<CampfireMetric
						label="Workspaces"
						value={String(report.summary?.workspaceCount ?? 0)}
						helper="With leave rows"
						icon={Globe2}
					/>
					<CampfireMetric
						label="Profiles"
						value={profiles.loading ? 'Loading' : 'Ready'}
						helper="User labels"
						icon={Umbrella}
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

					<GlobalLeaveControls
						range={report.range}
						disabled={report.isBusy}
						onChange={report.updateRange}
						onLoad={report.loadReport}
						onExport={report.exportCSV}
					/>

					{report.loadState === 'loading' || report.loadState === 'exporting' ? (
						<GlobalReportsLoading />
					) : null}

					{report.loadState !== 'loading' && report.summary === null && (
						<CampfireEmpty
							icon={Umbrella}
							title="No global leave report loaded"
							description="Choose a date range and load the global leave report."
						/>
					)}

					{report.loadState !== 'loading' && report.summary !== null && (
						<div className="cf:grid cf:gap-5">
							<GlobalLeaveBreakdownPanel
								workspaces={report.summary.workspaces}
								types={report.summary.types}
							/>

							<GlobalLeaveRowsPanel rows={report.summary.rows} labelForUserID={profiles.labelForUserID} />
						</div>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
