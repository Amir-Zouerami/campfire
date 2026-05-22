import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import type { Workspace } from '@/types/domain';

import { TimeReportControls } from './TimeReportControls';
import { TimeReportFeedback, TimeReportLoading } from './TimeReportFeedback';
import { TimeReportHero } from './TimeReportHero';
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
		<div className="cf:grid cf:gap-5">
			<TimeReportHero
				groupBy={report.filter.groupBy}
				totalMinutes={report.totalMinutes}
				rowCount={report.rowCount}
				entryCount={report.entryCount}
				profilesLoading={profiles.loading}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<TimeReportFeedback
						state={report.loadState}
						message={report.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					<TimeReportControls
						filter={report.filter}
						disabled={report.isBusy}
						onChange={report.updateFilter}
						onLoad={report.loadReport}
					/>

					{report.loadState === 'loading' && <TimeReportLoading />}

					{report.loadState !== 'loading' && report.summary !== null && (
						<TimeReportRowsPanel
							groupBy={report.summary.groupBy}
							rows={report.summary.rows}
							labelForUserID={profiles.labelForUserID}
						/>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
