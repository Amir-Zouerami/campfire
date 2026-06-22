import type { ReactElement } from 'react';
import { CalendarDays, Save } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireNotice } from '@/components/campfire/CampfireNotice';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';
import type { TFunction } from '@/i18n/types';

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

/**
 * WorkingDaysPanel renders weekday toggles for workspace working days.
 */
export function WorkingDaysPanel(props: WorkingDaysPanelProps): ReactElement {
	const { direction, t } = useI18n();
	const formDisabled = props.disabled || !props.canManageCalendar;
	const workingDayPresets = localizedWorkingDayPresets(t);

	return (
		<CampfireSettingsPanel
			eyebrow={t('settings.workingCalendar.rhythm.eyebrow')}
			title={t('settings.workingCalendar.rhythm.title')}
			description={t('settings.workingCalendar.rhythm.description')}
			icon={CalendarDays}
			meta={<span className={props.changed ? 'campfire-state-text campfire-state-text--dirty' : 'campfire-state-text'}>{props.changed ? t('settings.workingCalendar.rhythm.unsaved') : t('settings.workingCalendar.rhythm.saved')}</span>}
			actions={
				<CampfireControlButton
					type="button"
					disabled={formDisabled || !props.changed}
					onClick={() => void props.onSave()}
				>
					<Save className="cf:size-4" />
					{t('settings.workingCalendar.rhythm.save')}
				</CampfireControlButton>
			}
		>
			<div className="campfire-working-day-presets" aria-label={t('settings.workingCalendar.rhythm.presets.aria')}>
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

			<div className="campfire-weekday-strip campfire-weekday-strip--modern" role="group" aria-label={t('settings.workingCalendar.rhythm.days.aria')}>
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
							<span className="campfire-weekday-card-day">{primaryWeekdayName(t, option.weekday, direction)}</span>
							<span className="campfire-weekday-card-long">{secondaryWeekdayName(t, option.weekday, direction)}</span>
							<span className="campfire-weekday-card-state">{active ? t('settings.workingCalendar.rhythm.state.working') : t('settings.workingCalendar.rhythm.state.off')}</span>
						</button>
					);
				})}
			</div>

			<CampfireNotice
				icon={CalendarDays}
				title={t('settings.workingCalendar.rhythm.notice.title')}
				description={t('settings.workingCalendar.rhythm.notice.description')}
			/>
		</CampfireSettingsPanel>
	);
}

/**
 * localizedWorkingDayPresets returns translated preset labels while preserving raw weekday values.
 */
function localizedWorkingDayPresets(t: TFunction): readonly WorkingDayPreset[] {
	return [
		{
			label: t('settings.workingCalendar.preset.mondayFriday.label'),
			description: t('settings.workingCalendar.preset.mondayFriday.description'),
			weekdays: [1, 2, 3, 4, 5],
		},
		{
			label: t('settings.workingCalendar.preset.saturdayWednesday.label'),
			description: t('settings.workingCalendar.preset.saturdayWednesday.description'),
			weekdays: [6, 0, 1, 2, 3],
		},
		{
			label: t('settings.workingCalendar.preset.saturdayThursday.label'),
			description: t('settings.workingCalendar.preset.saturdayThursday.description'),
			weekdays: [6, 0, 1, 2, 3, 4],
		},
	];
}

/**
 * primaryWeekdayName returns the main weekday label for selector cards.
 */
function primaryWeekdayName(t: TFunction, weekday: number, direction: 'ltr' | 'rtl'): string {
	if (direction === 'rtl') {
		return localizedWeekdayName(t, weekday);
	}

	return englishWeekdayShortName(weekday);
}

/**
 * secondaryWeekdayName returns the supporting weekday label for selector cards.
 */
function secondaryWeekdayName(t: TFunction, weekday: number, direction: 'ltr' | 'rtl'): string {
	if (direction === 'rtl') {
		return englishWeekdayName(weekday);
	}

	return localizedWeekdayName(t, weekday);
}

/**
 * localizedWeekdayName returns a localized full weekday name.
 */
function localizedWeekdayName(t: TFunction, weekday: number): string {
	switch (weekday) {
		case 0:
			return t('setup.weekday.sunday');
		case 1:
			return t('setup.weekday.monday');
		case 2:
			return t('setup.weekday.tuesday');
		case 3:
			return t('setup.weekday.wednesday');
		case 4:
			return t('setup.weekday.thursday');
		case 5:
			return t('setup.weekday.friday');
		case 6:
			return t('setup.weekday.saturday');
		default:
			return String(weekday);
	}
}

/**
 * englishWeekdayName returns the English weekday name for bilingual RTL cards.
 */
function englishWeekdayName(weekday: number): string {
	switch (weekday) {
		case 0:
			return 'Sunday';
		case 1:
			return 'Monday';
		case 2:
			return 'Tuesday';
		case 3:
			return 'Wednesday';
		case 4:
			return 'Thursday';
		case 5:
			return 'Friday';
		case 6:
			return 'Saturday';
		default:
			return String(weekday);
	}
}

/**
 * englishWeekdayShortName returns a compact English weekday label.
 */
function englishWeekdayShortName(weekday: number): string {
	switch (weekday) {
		case 0:
			return 'Sun';
		case 1:
			return 'Mon';
		case 2:
			return 'Tue';
		case 3:
			return 'Wed';
		case 4:
			return 'Thu';
		case 5:
			return 'Fri';
		case 6:
			return 'Sat';
		default:
			return String(weekday);
	}
}
