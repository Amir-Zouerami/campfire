import { ApiClientError } from '@/api';
import type { TFunction } from '@/i18n/types';
import { cn } from '@/lib/utils';
import type { WorkspaceOffDay, WorkspaceWorkingDay } from '@/types/domain';

import type { WeekdayOption, WorkspaceOffDayDraft } from './working-calendar.types';

/**
 * weekdayOptions defines the seven configurable workspace weekdays.
 */
export const weekdayOptions: readonly WeekdayOption[] = [
	{ weekday: 0, shortName: 'Sun', longName: 'Sunday' },
	{ weekday: 1, shortName: 'Mon', longName: 'Monday' },
	{ weekday: 2, shortName: 'Tue', longName: 'Tuesday' },
	{ weekday: 3, shortName: 'Wed', longName: 'Wednesday' },
	{ weekday: 4, shortName: 'Thu', longName: 'Thursday' },
	{ weekday: 5, shortName: 'Fri', longName: 'Friday' },
	{ weekday: 6, shortName: 'Sat', longName: 'Saturday' },
];


/**
 * weekdayOptionsForTimezone returns weekday buttons in the workspace-local week order.
 */
export function weekdayOptionsForTimezone(timezone: string): readonly WeekdayOption[] {
	if (timezone.trim() === 'Asia/Tehran') {
		return [
			{ weekday: 6, shortName: 'Sat', longName: 'Saturday' },
			{ weekday: 0, shortName: 'Sun', longName: 'Sunday' },
			{ weekday: 1, shortName: 'Mon', longName: 'Monday' },
			{ weekday: 2, shortName: 'Tue', longName: 'Tuesday' },
			{ weekday: 3, shortName: 'Wed', longName: 'Wednesday' },
			{ weekday: 4, shortName: 'Thu', longName: 'Thursday' },
			{ weekday: 5, shortName: 'Fri', longName: 'Friday' },
		];
	}

	return weekdayOptions;
}

/**
 * emptyWorkspaceOffDayDraft returns the default off-day form state.
 */
export function emptyWorkspaceOffDayDraft(): WorkspaceOffDayDraft {
	return {
		date: getTodayLocalDateString(),
		label: '',
	};
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
export function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * enabledWeekdaysFromWorkingDays returns sorted enabled weekday numbers.
 */
export function enabledWeekdaysFromWorkingDays(workingDays: readonly WorkspaceWorkingDay[]): readonly number[] {
	return workingDays
		.filter(workingDay => workingDay.enabled)
		.map(workingDay => workingDay.weekday)
		.sort((first, second) => first - second);
}

/**
 * toggleWeekday returns the next selected weekday list.
 */
export function toggleWeekday(selectedWeekdays: readonly number[], weekday: number): readonly number[] {
	if (selectedWeekdays.includes(weekday)) {
		return selectedWeekdays.filter(selectedWeekday => selectedWeekday !== weekday);
	}

	return [...selectedWeekdays, weekday].sort((first, second) => first - second);
}

/**
 * sameWeekdays returns whether two weekday arrays contain the same numbers in order.
 */
export function sameWeekdays(first: readonly number[], second: readonly number[]): boolean {
	if (first.length !== second.length) {
		return false;
	}

	return first.every((value, index) => value === second[index]);
}

/**
 * weekdayShortName returns a short weekday label.
 */
export function weekdayShortName(weekday: number): string {
	return weekdayOptions.find(option => option.weekday === weekday)?.shortName ?? String(weekday);
}

/**
 * selectedWeekdayLabel returns a compact selected-days label.
 */
export function selectedWeekdayLabel(selectedWeekdays: readonly number[], t: TFunction): string {
	if (selectedWeekdays.length === 0) {
		return t('settings.workingCalendar.error.weekdayRequired');
	}

	return selectedWeekdays.map(weekdayShortName).join(', ');
}

/**
 * sortWorkspaceOffDays returns off-days ordered by date.
 */
export function sortWorkspaceOffDays(offDays: readonly WorkspaceOffDay[]): readonly WorkspaceOffDay[] {
	return [...offDays].sort((first, second) => first.date.localeCompare(second.date));
}

/**
 * upcomingWorkspaceOffDayCount returns count of off-days from today onward.
 */
export function upcomingWorkspaceOffDayCount(offDays: readonly WorkspaceOffDay[]): number {
	const today = getTodayLocalDateString();

	return offDays.filter(offDay => offDay.date >= today).length;
}

/**
 * workspaceOffDayIsPast returns whether an off-day is before today.
 */
export function workspaceOffDayIsPast(offDay: WorkspaceOffDay): boolean {
	return offDay.date < getTodayLocalDateString();
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string, locale: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}

/**
 * weekdayButtonClassName returns a selectable weekday button style.
 */
export function weekdayButtonClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-h-[96px] cf:flex-col cf:items-start cf:justify-between cf:rounded-2xl cf:border cf:p-4 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.035] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.06]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.10] cf:shadow-lg',
	);
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown, t: TFunction): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return t('settings.workingCalendar.error.update');
}
