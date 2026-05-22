import type { ReactElement } from 'react';
import { CalendarDays, Umbrella, Users } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

import type { TeamAvailabilityRange } from './team-availability.types';

/**
 * TeamAvailabilityHeroProps contains availability summary metrics.
 */
type TeamAvailabilityHeroProps = {
	readonly today: string;
	readonly weekRange: TeamAvailabilityRange;
	readonly todayCount: number;
	readonly weekCount: number;
	readonly rangeCount: number;
	readonly profilesLoading: boolean;
};

/**
 * TeamAvailabilityHero renders the availability page header.
 */
export function TeamAvailabilityHero(props: TeamAvailabilityHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Availability"
				title="Who is out"
				description="Review approved leave for today, this week, and the selected planning window."
				icon={Umbrella}
				action={<CampfireStatusPill tone="green">Approved leave</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Today"
					value={String(props.todayCount)}
					helper={props.today}
					icon={CalendarDays}
				/>
				<CampfireMetric
					label="This week"
					value={String(props.weekCount)}
					helper={`${props.weekRange.startDate} → ${props.weekRange.endDate}`}
				/>
				<CampfireMetric
					label="Selected range"
					value={String(props.rangeCount)}
					helper="Approved rows"
					icon={Users}
				/>
				<CampfireMetric
					label="Profiles"
					value={props.profilesLoading ? 'Loading' : 'Ready'}
					helper="User labels"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
