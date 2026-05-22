import type { ReactElement } from 'react';
import { CalendarDays, CalendarX2, Settings2 } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * WorkingCalendarHeroProps contains working calendar summary metrics.
 */
type WorkingCalendarHeroProps = {
	readonly selectedWeekdayLabel: string;
	readonly workingDayCount: number;
	readonly offDayCount: number;
	readonly upcomingOffDayCount: number;
	readonly canManageCalendar: boolean;
};

/**
 * WorkingCalendarHero renders the Working Calendar settings header.
 */
export function WorkingCalendarHero(props: WorkingCalendarHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Working Calendar"
				title="Working days and workspace off-days"
				description="Control which days count as workdays and which workspace dates should suppress standup automation."
				icon={Settings2}
				action={
					<CampfireStatusPill tone={props.canManageCalendar ? 'green' : 'slate'}>
						{props.canManageCalendar ? 'Editable' : 'Read-only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Working days"
					value={String(props.workingDayCount)}
					helper={props.selectedWeekdayLabel}
					icon={CalendarDays}
				/>
				<CampfireMetric
					label="Off-days"
					value={String(props.offDayCount)}
					helper="Workspace skip dates"
					icon={CalendarX2}
				/>
				<CampfireMetric label="Upcoming" value={String(props.upcomingOffDayCount)} helper="Today and later" />
			</CampfireCardBody>
		</CampfirePanel>
	);
}
