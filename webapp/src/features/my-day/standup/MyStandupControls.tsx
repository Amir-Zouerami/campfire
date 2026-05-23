import type { ReactElement } from 'react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatLabel, templateLabel } from './my-standup.helpers';

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
 * MyStandupControls renders the schedule and standup date controls.
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

			<CampfireField id="campfire-my-standup-date" label="Standup date">
				<CampfireDateInput
					id="campfire-my-standup-date"
					disabled={props.disabled}
					value={props.occurrenceDate}
					onValueChange={props.onOccurrenceDateChange}
				/>
			</CampfireField>
		</div>
	);
}
