import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatLabel, selectClassName, templateLabel } from './my-standup.helpers';

/**
 * MyStandupControlsProps contains schedule and date selection state.
 */
type MyStandupControlsProps = {
	readonly schedules: readonly StandupSchedule[];
	readonly templates: readonly StandupTemplate[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly disabled: boolean;
	readonly onScheduleChange: (scheduleID: string) => void;
	readonly onOccurrenceDateChange: (date: string) => void;
};

/**
 * MyStandupControls renders the schedule and occurrence date controls.
 */
export function MyStandupControls(props: MyStandupControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_14rem]">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-my-standup-schedule">Schedule</Label>
				<select
					id="campfire-my-standup-schedule"
					className={selectClassName()}
					disabled={props.disabled}
					value={props.selectedScheduleID}
					onChange={event => props.onScheduleChange(event.currentTarget.value)}
				>
					{props.schedules.map(schedule => (
						<option key={schedule.id} value={schedule.id}>
							{formatLabel(schedule.kind)} · {templateLabel(props.templates, schedule.templateId)} ·{' '}
							{schedule.timeOfDay}
						</option>
					))}
				</select>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-my-standup-date">Occurrence date</Label>
				<Input
					id="campfire-my-standup-date"
					type="date"
					disabled={props.disabled}
					value={props.occurrenceDate}
					onChange={event => props.onOccurrenceDateChange(event.currentTarget.value)}
				/>
			</div>
		</div>
	);
}
