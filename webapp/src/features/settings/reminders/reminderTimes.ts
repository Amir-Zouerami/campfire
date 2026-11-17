/**
 * Reminders are stored as minute offsets from the moment the standup window opens, but people
 * think in clock times ("09:45"). These helpers convert between the two and keep every
 * reminder strictly inside the window.
 */

export const MAX_REMINDER_TIMES = 3;

/**
 * timeToMinutes parses a 24-hour HH:mm time; it returns null for anything else.
 */
export function timeToMinutes(value: string): number | null {
	const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
	if (match === null) {
		return null;
	}

	const hour = Number(match[1]);
	const minute = Number(match[2]);

	return hour > 23 || minute > 59 ? null : hour * 60 + minute;
}

/**
 * minutesToTime formats minutes since midnight as HH:mm.
 */
export function minutesToTime(minutes: number): string {
	const normalized = (minutes + 24 * 60) % (24 * 60);

	return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

/**
 * offsetsToTimes shows stored offsets as clock times, always returning three slots (blank when unused).
 */
export function offsetsToTimes(offsets: readonly number[], opensAt: string, closesAt: string): readonly string[] {
	const open = timeToMinutes(opensAt);
	const close = timeToMinutes(closesAt);
	if (open === null || close === null || open >= close) {
		return Array.from({ length: MAX_REMINDER_TIMES }, () => '');
	}

	const times = [...new Set(offsets)]
		.filter(offset => Number.isInteger(offset) && offset >= 0 && offset < close - open)
		.sort((first, second) => first - second)
		.slice(0, MAX_REMINDER_TIMES)
		.map(offset => minutesToTime(open + offset));

	return Array.from({ length: MAX_REMINDER_TIMES }, (_, index) => times[index] ?? '');
}

/**
 * timesToOffsets turns entered clock times into sorted, de-duplicated offsets, dropping any
 * time that is blank, malformed or outside the window.
 */
export function timesToOffsets(times: readonly string[], opensAt: string, closesAt: string): readonly number[] {
	const open = timeToMinutes(opensAt);
	const close = timeToMinutes(closesAt);
	if (open === null || close === null || open >= close) {
		return [];
	}

	const offsets = times
		.slice(0, MAX_REMINDER_TIMES)
		.map(timeToMinutes)
		.filter((minutes): minutes is number => minutes !== null && minutes >= open && minutes < close)
		.map(minutes => minutes - open);

	return [...new Set(offsets)].sort((first, second) => first - second);
}

export type ReminderTimesProblem = 'none' | 'chooseOne' | 'insideWindow' | 'partialSave';

/**
 * checkReminderTimes explains why the entered times cannot be saved as-is.
 * `partialSave` is a warning: saving still works, but some entries will be dropped.
 */
export function checkReminderTimes(times: readonly string[], opensAt: string, closesAt: string): ReminderTimesProblem {
	const entered = times.map(value => value.trim()).filter(value => value !== '');
	if (entered.length === 0) {
		return 'chooseOne';
	}

	const valid = timesToOffsets(times, opensAt, closesAt);
	if (valid.length === 0) {
		return 'insideWindow';
	}

	return valid.length !== new Set(entered).size ? 'partialSave' : 'none';
}
