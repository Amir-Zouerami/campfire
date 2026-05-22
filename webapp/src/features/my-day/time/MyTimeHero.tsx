import type { ReactElement } from 'react';
import { Clock3, ListTodo, Timer } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

import { formatMinutes } from './my-time.helpers';

/**
 * MyTimeHeroProps contains summary metrics for the time-log flow.
 */
type MyTimeHeroProps = {
	readonly activeTaskCount: number;
	readonly totalTaskCount: number;
	readonly recentMinutes: number;
};

/**
 * MyTimeHero renders the simple tasks/time page header.
 */
export function MyTimeHero(props: MyTimeHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Time log"
				title="Tasks and time"
				description="Create your own tasks, log time quickly, and keep reports out of the daily workflow."
				icon={Timer}
				action={<CampfireStatusPill tone="ember">Personal</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Active tasks"
					value={String(props.activeTaskCount)}
					helper="In progress"
					icon={ListTodo}
				/>
				<CampfireMetric label="Total tasks" value={String(props.totalTaskCount)} helper="Current filter" />
				<CampfireMetric
					label="Recent time"
					value={formatMinutes(props.recentMinutes)}
					helper="Last 14 days"
					icon={Clock3}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
