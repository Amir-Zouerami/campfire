import type { ReactElement } from 'react';
import { CalendarX2, Globe2, ShieldCheck } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * GlobalOffDaysHeroProps contains global off-day summary state.
 */
type GlobalOffDaysHeroProps = {
	readonly skipDateCount: number;
	readonly upcomingCount: number;
	readonly isSystemAdmin: boolean;
};

/**
 * GlobalOffDaysHero renders the global off-days page header.
 */
export function GlobalOffDaysHero(props: GlobalOffDaysHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Global Off-days"
				title="Campfire-wide skip dates"
				description="Global off-days suppress standup automation across every workspace."
				icon={Globe2}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'Read-only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Global dates"
					value={String(props.skipDateCount)}
					helper="All configured"
					icon={CalendarX2}
				/>
				<CampfireMetric
					label="Upcoming"
					value={String(props.upcomingCount)}
					helper="Today and later"
					icon={Globe2}
				/>
				<CampfireMetric
					label="Access"
					value={props.isSystemAdmin ? 'Editable' : 'Read-only'}
					helper="System admin only"
					icon={ShieldCheck}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
