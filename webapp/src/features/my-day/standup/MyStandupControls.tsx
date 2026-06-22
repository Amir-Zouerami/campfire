import type { ReactElement } from 'react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { localizedScheduleKindLabel, templateLabel } from './my-standup.helpers';

/**
 * MyStandupControlsProps contains schedule and occurrence-date context.
 */
type MyStandupControlsProps = {
	readonly schedules: readonly StandupSchedule[];
	readonly templates: readonly StandupTemplate[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly disabled: boolean;
	readonly onDateChange: (date: string) => void;
	readonly onScheduleChange: (scheduleID: string) => void;
};

/**
 * MyStandupControls renders schedule selection and editable standup date.
 */
export function MyStandupControls(props: MyStandupControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-standup-controls-grid">
			<CampfireField id="campfire-my-standup-schedule" label={t('myDay.standup.controls.schedule.label')}>
				<CampfireSelect
					id="campfire-my-standup-schedule"
					disabled={props.disabled || props.schedules.length === 0}
					value={props.selectedScheduleID}
					onValueChange={props.onScheduleChange}
				>
					{props.schedules.length === 0 && <option value="">{t('myDay.standup.controls.schedule.empty')}</option>}
					{props.schedules.map(schedule => (
						<option key={schedule.id} value={schedule.id}>
							{localizedScheduleKindLabel(schedule.kind, t)} · {templateLabel(props.templates, schedule.templateId, t)} · {schedule.timeOfDay}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

			<CampfireField id="campfire-my-standup-date" label={t('myDay.standup.controls.date.label')}>
				<CampfireDateInput
					id="campfire-my-standup-date"
					disabled={props.disabled}
					timezone={props.timezone}
					workingDays={props.workingDays}
					value={props.occurrenceDate}
					onValueChange={props.onDateChange}
				/>
			</CampfireField>
		</div>
	);
}
