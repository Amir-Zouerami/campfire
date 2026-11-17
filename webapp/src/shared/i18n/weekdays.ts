import type { TranslationKey } from './messages';
import type { TFunction } from './types';

type WeekdayKeys = { readonly long: TranslationKey; readonly short: TranslationKey };

/**
 * WEEKDAY_KEYS maps the backend's weekday numbering (0 = Sunday … 6 = Saturday) to labels.
 */
const WEEKDAY_KEYS: readonly WeekdayKeys[] = [
	{ long: 'setup.weekday.sunday', short: 'setup.weekday.sunday.short' },
	{ long: 'setup.weekday.monday', short: 'setup.weekday.monday.short' },
	{ long: 'setup.weekday.tuesday', short: 'setup.weekday.tuesday.short' },
	{ long: 'setup.weekday.wednesday', short: 'setup.weekday.wednesday.short' },
	{ long: 'setup.weekday.thursday', short: 'setup.weekday.thursday.short' },
	{ long: 'setup.weekday.friday', short: 'setup.weekday.friday.short' },
	{ long: 'setup.weekday.saturday', short: 'setup.weekday.saturday.short' },
];

/**
 * weekdayLabel returns a weekday's translated name.
 */
export function weekdayLabel(t: TFunction, weekday: number, form: 'long' | 'short' = 'long'): string {
	const keys = WEEKDAY_KEYS[((weekday % 7) + 7) % 7];

	return keys === undefined ? String(weekday) : t(form === 'long' ? keys.long : keys.short);
}

/**
 * orderedWeekdays lists the seven weekdays starting from the workspace's first day of the week.
 */
export function orderedWeekdays(weekStart: number): readonly number[] {
	return Array.from({ length: 7 }, (_unused, offset) => (weekStart + offset) % 7);
}
