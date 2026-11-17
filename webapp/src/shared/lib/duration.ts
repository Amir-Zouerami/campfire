/**
 * formatMinutes renders minutes as a compact duration such as "1h 30m".
 */
export function formatMinutes(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const hours = Math.floor(total / 60);
	const remainder = total % 60;

	if (hours === 0) {
		return `${remainder}m`;
	}

	return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

/**
 * parseDurationMinutes accepts "90", "1.5h", "1h 30m", "1:30" or "45m" and returns whole minutes.
 */
export function parseDurationMinutes(value: string): number | null {
	const text = value.trim().toLowerCase();
	if (text === '') {
		return null;
	}

	const clock = /^(\d{1,3}):([0-5]\d)$/.exec(text);
	if (clock !== null) {
		return Number(clock[1]) * 60 + Number(clock[2]);
	}

	const compound = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(text);
	if (compound !== null && (compound[1] !== undefined || compound[2] !== undefined)) {
		return Math.round(Number(compound[1] ?? 0) * 60) + Number(compound[2] ?? 0);
	}

	if (/^\d+$/.test(text)) {
		return Number(text);
	}

	return null;
}

/**
 * TIME_OF_DAY_PATTERN matches a 24-hour HH:mm clock time.
 */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * isTimeOfDay reports whether a value is a valid 24-hour HH:mm time.
 */
export function isTimeOfDay(value: string): boolean {
	return TIME_OF_DAY_PATTERN.test(value.trim());
}

/**
 * timeOfDayToMinutes converts HH:mm to minutes since midnight.
 */
export function timeOfDayToMinutes(value: string): number | null {
	const match = TIME_OF_DAY_PATTERN.exec(value.trim());

	return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

/**
 * minutesToTimeOfDay converts minutes since midnight to HH:mm.
 */
export function minutesToTimeOfDay(minutes: number): string {
	const clamped = Math.min(Math.max(Math.round(minutes), 0), 24 * 60 - 1);

	return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/**
 * normalizeTimeInput turns typed text such as "930", "9:30" or "9.5" into HH:mm,
 * or null when it is not a valid 24-hour time.
 */
export function normalizeTimeInput(value: string): string | null {
	const text = value.trim().replace(/[.\-\s]/g, ':');
	const separated = /^(\d{1,2}):(\d{1,2})$/.exec(text);
	const compact = /^(\d{3,4})$/.exec(text);
	const hoursOnly = /^(\d{1,2})$/.exec(text);

	let hours: number;
	let minutes: number;

	if (separated !== null) {
		hours = Number(separated[1]);
		minutes = Number(separated[2]);
	} else if (compact !== null) {
		const digits = (compact[1] ?? '').padStart(4, '0');
		hours = Number(digits.slice(0, 2));
		minutes = Number(digits.slice(2));
	} else if (hoursOnly !== null) {
		hours = Number(hoursOnly[1]);
		minutes = 0;
	} else {
		return null;
	}

	if (hours > 23 || minutes > 59) {
		return null;
	}

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
