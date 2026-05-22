import type { ReactElement } from 'react';
import { CalendarCheck2, ClipboardList, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * MyLeaveHeroProps contains summary metrics for the leave workflow.
 */
type MyLeaveHeroProps = {
	readonly activeLeaveCount: number;
	readonly pendingLeaveCount: number;
	readonly approvedLeaveCount: number;
};

/**
 * MyLeaveHero renders the personal leave page header.
 */
export function MyLeaveHero(props: MyLeaveHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Leave"
				title="My leave"
				description="Request leave and track your own active requests. Approval queues and team availability stay in Team Review."
				icon={Umbrella}
				action={<CampfireStatusPill tone="ember">Personal</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Active requests"
					value={String(props.activeLeaveCount)}
					helper="Pending and approved"
					icon={ClipboardList}
				/>
				<CampfireMetric label="Pending" value={String(props.pendingLeaveCount)} helper="Awaiting decision" />
				<CampfireMetric
					label="Approved"
					value={String(props.approvedLeaveCount)}
					helper="Currently active"
					icon={CalendarCheck2}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
