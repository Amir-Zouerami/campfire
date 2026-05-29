import type { ReactElement } from 'react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatLabel, templateLabel } from './my-standup.helpers';

/**
 * MyStandupControlsProps contains schedule and occurrence-date context.
 */
type MyStandupControlsProps = {
	readonly schedules: readonly StandupSchedule[];
	readonly templates: readonly StandupTemplate[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly timezone: string;
	readonly disabled: boolean;
	readonly onDateChange: (date: string) => void;
	readonly onScheduleChange: (scheduleID: string) => void;
};

/**
 * MyStandupControls renders schedule selection and editable standup date.
 */
export function MyStandupControls(props: MyStandupControlsProps): ReactElement {
	return (
		<div className="campfire-standup-controls-grid">
			<CampfireField id="campfire-my-standup-schedule" label="Schedule">
				<CampfireSelect
					id="campfire-my-standup-schedule"
					disabled={props.disabled || props.schedules.length === 0}
					value={props.selectedScheduleID}
					onValueChange={props.onScheduleChange}
				>
					{props.schedules.length === 0 && <option value="">No schedule for this date</option>}
					{props.schedules.map(schedule => (
						<option key={schedule.id} value={schedule.id}>
							{formatLabel(schedule.kind)} · {templateLabel(props.templates, schedule.templateId)} · {schedule.timeOfDay}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

			<CampfireField id="campfire-my-standup-date" label="Standup date">
				<CampfireDateInput
					id="campfire-my-standup-date"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.occurrenceDate}
					onValueChange={props.onDateChange}
				/>
			</CampfireField>
		</div>
	);
}
