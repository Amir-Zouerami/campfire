import type { ReactElement } from 'react';
import { CalendarDays, Save } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireNotice } from '@/components/campfire/CampfireNotice';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';

import { sameWeekdays, toggleWeekday, weekdayOptionsForTimezone } from './working-calendar.helpers';

/**
 * WorkingDaysPanelProps contains working-day selection state.
 */
type WorkingDaysPanelProps = {
	readonly selectedWeekdays: readonly number[];
	readonly disabled: boolean;
	readonly changed: boolean;
	readonly canManageCalendar: boolean;
	readonly timezone: string;
	readonly onChange: (weekdays: readonly number[]) => void;
	readonly onSave: () => Promise<void>;
};

type WorkingDayPreset = {
	readonly label: string;
	readonly description: string;
	readonly weekdays: readonly number[];
};

const workingDayPresets: readonly WorkingDayPreset[] = [
	{
		label: 'Monday to Friday',
		description: 'Common western work week.',
		weekdays: [1, 2, 3, 4, 5],
	},
	{
		label: 'Saturday to Wednesday',
		description: 'Common Iran/Gulf-style team rhythm.',
		weekdays: [6, 0, 1, 2, 3],
	},
	{
		label: 'Saturday to Thursday',
		description: 'Use when Thursday is still a working day.',
		weekdays: [6, 0, 1, 2, 3, 4],
	},
];

/**
 * WorkingDaysPanel renders weekday toggles for workspace working days.
 */
export function WorkingDaysPanel(props: WorkingDaysPanelProps): ReactElement {
	const formDisabled = props.disabled || !props.canManageCalendar;

	return (
		<CampfireSettingsPanel
			eyebrow="Weekly rhythm"
			title="Choose active workdays"
			description="Pick a preset or toggle individual days. Campfire uses this pattern to decide when standups open, reminders run, and weekly reports close."
			icon={CalendarDays}
			meta={<span className={props.changed ? 'campfire-state-text campfire-state-text--dirty' : 'campfire-state-text'}>{props.changed ? 'Unsaved changes' : 'Saved'}</span>}
			actions={
				<CampfireControlButton
					type="button"
					disabled={formDisabled || !props.changed}
					onClick={() => void props.onSave()}
				>
					<Save className="cf:size-4" />
					Save working days
				</CampfireControlButton>
			}
		>
			<div className="campfire-working-day-presets" aria-label="Working day presets">
				{workingDayPresets.map(preset => (
					<button
						key={preset.label}
						type="button"
						className={sameWeekdays([...props.selectedWeekdays].sort(), [...preset.weekdays].sort()) ? 'campfire-working-day-preset campfire-working-day-preset--active' : 'campfire-working-day-preset'}
						disabled={formDisabled}
						onClick={() => props.onChange(preset.weekdays)}
					>
						<strong>{preset.label}</strong>
						<span>{preset.description}</span>
					</button>
				))}
			</div>

			<div className="campfire-weekday-strip campfire-weekday-strip--modern" role="group" aria-label="Workspace working days">
				{weekdayOptionsForTimezone(props.timezone).map(option => {
					const active = props.selectedWeekdays.includes(option.weekday);

					return (
						<button
							key={option.weekday}
							type="button"
							className={active ? 'campfire-weekday-card campfire-weekday-card--active' : 'campfire-weekday-card'}
							disabled={formDisabled}
							aria-pressed={active}
							onClick={() => props.onChange(toggleWeekday(props.selectedWeekdays, option.weekday))}
						>
							<span className="campfire-weekday-card-day">{option.shortName}</span>
							<span className="campfire-weekday-card-long">{option.longName}</span>
							<span className="campfire-weekday-card-state">{active ? 'Working' : 'Off'}</span>
						</button>
					);
				})}
			</div>

			<CampfireNotice
				icon={CalendarDays}
				title="Choose the rhythm your team actually follows."
				description="Campfire supports Monday to Friday, Saturday to Wednesday, Saturday to Thursday, or any custom pattern. Standups, reminders, runtime decisions, and weekly reports use this calendar."
			/>
		</CampfireSettingsPanel>
	);
}
