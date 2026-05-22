import type { ReactElement } from 'react';
import { BarChart3, Clock3, ListChecks, Rows3, Users } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { TimeReportGroupBy } from '@/types/domain';

import { formatMinutes, formatTimeReportGroupBy } from './time-report.helpers';

/**
 * TimeReportHeroProps contains summary metrics for the time report page.
 */
type TimeReportHeroProps = {
	readonly groupBy: TimeReportGroupBy;
	readonly totalMinutes: number;
	readonly rowCount: number;
	readonly entryCount: number;
	readonly profilesLoading: boolean;
};

/**
 * TimeReportHero renders the workspace time report header.
 */
export function TimeReportHero(props: TimeReportHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Time report"
				title="Workspace time summary"
				description="Group tracked time by person, project, category, task, day, or week."
				icon={BarChart3}
				action={
					<CampfireStatusPill tone="green">
						<Clock3 className="cf:size-3.5" />
						{formatMinutes(props.totalMinutes)}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Total time"
					value={formatMinutes(props.totalMinutes)}
					helper="Selected range"
					icon={Clock3}
				/>
				<CampfireMetric label="Rows" value={String(props.rowCount)} helper="Grouped results" icon={Rows3} />
				<CampfireMetric label="Entries" value={String(props.entryCount)} helper="Time logs" icon={ListChecks} />
				<CampfireMetric
					label="Group by"
					value={formatTimeReportGroupBy(props.groupBy)}
					helper={props.profilesLoading ? 'Profiles loading' : 'Profiles ready'}
					icon={Users}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
