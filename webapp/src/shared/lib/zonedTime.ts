import { parseIsoDate } from './date';
import type { IsoDate } from './date';

/**
 * zoneOffsetMinutes returns how far a timezone is ahead of UTC at a given instant.
 */
function zoneOffsetMinutes(instant: Date, timezone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(instant);
	const pick = (type: string): number => Number(parts.find(part => part.type === type)?.value ?? '0');
	const asUTC = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'));

	return Math.round((asUTC - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/**
 * zonedDateTimeToInstant converts a wall-clock date and time in an IANA timezone to the
 * absolute instant it denotes, independent of the browser's own timezone. Returns null for
 * malformed input or an unknown timezone.
 */
export function zonedDateTimeToInstant(date: IsoDate, time: string, timezone: string): Date | null {
	const day = parseIsoDate(date);
	const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
	if (day === null || match === null) {
		return null;
	}

	const wallAsUTC = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Number(match[1]), Number(match[2]));

	try {
		// The offset depends on the instant itself (daylight saving), so refine the guess once.
		const firstGuess = wallAsUTC - zoneOffsetMinutes(new Date(wallAsUTC), timezone) * 60_000;
		const refined = wallAsUTC - zoneOffsetMinutes(new Date(firstGuess), timezone) * 60_000;

		return new Date(refined);
	} catch {
		return null;
	}
}
