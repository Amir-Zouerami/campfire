import type { ReactElement } from 'react';
import { Clock3, ListChecks, Rows3, Users } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
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
 * TimeReportsPage renders the rewritten workspace time report workflow.
 */
export function TimeReportsPage(props: TimeReportsPageProps): ReactElement {
	const report = useTimeReport({
		workspace: props.workspace,
	});

	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={Clock3} label="Total time" value={formatMinutes(report.totalMinutes)} helper="Selected range" />
				<CampfireStatCard icon={Rows3} label="Rows" value={String(report.rowCount)} helper="Grouped results" tone="blue" />
				<CampfireStatCard icon={ListChecks} label="Entries" value={String(report.entryCount)} helper="Time logs" />
				<CampfireStatCard
					icon={Users}
					label="Group by"
					value={formatTimeReportGroupBy(report.filter.groupBy)}
					helper={profiles.loading ? 'Profiles loading' : 'Profiles ready'}
					tone="green"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Time report</p>
						<h3 className="campfire-surface-title">Report controls</h3>
						<p className="campfire-surface-description">Load grouped time totals for the selected range.</p>
					</div>
				</header>

				<TimeReportFeedback
					state={report.loadState}
					message={report.message}
					profileErrorMessage={profiles.errorMessage}
				/>

				<TimeReportControls
					filter={report.filter}
					disabled={report.isBusy}
					timezone={props.workspace.timezone}
					onChange={report.updateFilter}
					onLoad={report.loadReport}
				/>
			</CampfireSurface>

			{report.loadState === 'loading' && <TimeReportLoading />}

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
