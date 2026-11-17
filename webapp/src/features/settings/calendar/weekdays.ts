/**
 * Working days use the backend numbering: 0 = Sunday … 6 = Saturday.
 */

export type WorkingDayPreset = {
	readonly id: 'mondayFriday' | 'saturdayWednesday' | 'saturdayThursday';
	readonly weekdays: readonly number[];
};

export const WORKING_DAY_PRESETS: readonly WorkingDayPreset[] = [
	{ id: 'mondayFriday', weekdays: [1, 2, 3, 4, 5] },
	{ id: 'saturdayWednesday', weekdays: [6, 0, 1, 2, 3] },
	{ id: 'saturdayThursday', weekdays: [6, 0, 1, 2, 3, 4] },
];

/**
 * toggleWeekday adds or removes one weekday, keeping the list sorted.
 */
export function toggleWeekday(selected: readonly number[], weekday: number): readonly number[] {
	return selected.includes(weekday)
		? selected.filter(value => value !== weekday)
		: [...selected, weekday].sort((first, second) => first - second);
}

/**
 * sameWeekdays compares two selections regardless of order.
 */
export function sameWeekdays(first: readonly number[], second: readonly number[]): boolean {
	const left = [...first].sort((a, b) => a - b);
	const right = [...second].sort((a, b) => a - b);

	return left.length === right.length && left.every((value, index) => value === right[index]);
}
