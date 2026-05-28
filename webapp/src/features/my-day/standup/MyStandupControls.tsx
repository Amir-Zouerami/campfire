import type { ReactElement } from 'react';
import { CalendarDays } from 'lucide-react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatLabel, templateLabel } from './my-standup.helpers';

/**
 * MyStandupControlsProps contains schedule and today-only standup context.
 */
type MyStandupControlsProps = {
	readonly schedules: readonly StandupSchedule[];
	readonly templates: readonly StandupTemplate[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly disabled: boolean;
	readonly onScheduleChange: (scheduleID: string) => void;
};

/**
 * MyStandupControls renders schedule selection and a read-only today indicator.
 */
export function MyStandupControls(props: MyStandupControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_14rem]">
			<CampfireField id="campfire-my-standup-schedule" label="Schedule">
				<CampfireSelect
					id="campfire-my-standup-schedule"
					disabled={props.disabled}
					value={props.selectedScheduleID}
					onValueChange={props.onScheduleChange}
				>
					{props.schedules.map(schedule => (
						<option key={schedule.id} value={schedule.id}>
							{formatLabel(schedule.kind)} · {templateLabel(props.templates, schedule.templateId)} ·{' '}
							{schedule.timeOfDay}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

			<div className="cf:grid cf:gap-2">
				<p className="cf:m-0 cf:text-sm cf:font-bold cf:text-foreground">Today</p>
				<div className="cf:flex cf:h-10 cf:items-center cf:justify-between cf:gap-3 cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/35 cf:px-3">
					<span className="cf:text-sm cf:font-black cf:text-foreground">{props.occurrenceDate}</span>
					<CalendarDays className="cf:size-4 cf:text-amber-200" aria-hidden="true" />
				</div>
			</div>
		</div>
	);
}
