/**
 * formatWorkspaceDateHint formats exactly one alternate local-calendar label for
 * a stored ISO date without changing the canonical YYYY-MM-DD API value.
 *
 * Campfire stores dates as Gregorian local dates. The hint is intentionally
 * timezone-driven: Tehran workspaces get the Persian/Jalali calendar, Arabic
 * region workspaces get a Hijri label, and other workspaces stay uncluttered.
 */
export function formatWorkspaceDateHint(dateValue: string, timezone?: string): string {
	const date = parseISODateAsUTCNoon(dateValue);
	if (date === null) {
		return '';
	}

	const calendar = calendarForTimezone(timezone);
	if (calendar === 'none') {
		return '';
	}

	if (calendar === 'persian') {
		return formatCalendarLabel(date, timezone ?? '', 'fa-IR-u-ca-persian', 'Persian', 'persian');
	}

	return formatCalendarLabel(date, timezone ?? '', 'ar-SA-u-ca-islamic', 'Hijri', 'islamic');
}

/**
 * calendarForTimezone returns the one alternate calendar that should be shown
 * for a workspace timezone.
 */
function calendarForTimezone(timezone?: string): 'persian' | 'hijri' | 'none' {
	const cleanTimezone = timezone?.trim() ?? '';
	if (cleanTimezone === '') {
		return 'none';
	}

	if (persianCalendarTimezones.has(cleanTimezone)) {
		return 'persian';
	}

	if (hijriCalendarTimezones.has(cleanTimezone)) {
		return 'hijri';
	}

	return 'none';
}

/**
 * formatCalendarLabel wraps Intl.DateTimeFormat defensively so unsupported
 * calendars or invalid time zones never break a date input.
 */
function formatCalendarLabel(
	date: Date,
	timezone: string,
	locale: string,
	label: string,
	calendar: 'persian' | 'islamic',
): string {
	try {
		const parts = new Intl.DateTimeFormat(locale, {
			calendar,
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: timezone,
		}).formatToParts(date);
		const day = parts.find(part => part.type === 'day')?.value ?? '';
		const month = parts.find(part => part.type === 'month')?.value ?? '';
		const year = parts.find(part => part.type === 'year')?.value ?? '';
		const formatted = [day, month, year].filter(Boolean).join(' ');

		return `${label}: ${formatted}`;
	} catch {
		return '';
	}
}

/**
 * parseISODateAsUTCNoon parses YYYY-MM-DD as noon UTC to avoid DST boundary
 * changes while still letting Intl render the correct local calendar day for
 * normal workspace time zones.
 */
function parseISODateAsUTCNoon(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (match === null) {
		return null;
	}

	const year = Number.parseInt(match[1] ?? '', 10);
	const month = Number.parseInt(match[2] ?? '', 10);
	const day = Number.parseInt(match[3] ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null;
	}

	const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return null;
	}

	return date;
}

const persianCalendarTimezones = new Set(['Asia/Tehran']);

const hijriCalendarTimezones = new Set([
	'Africa/Algiers',
	'Africa/Cairo',
	'Africa/Casablanca',
	'Africa/Khartoum',
	'Africa/Tripoli',
	'Africa/Tunis',
	'Asia/Amman',
	'Asia/Baghdad',
	'Asia/Bahrain',
	'Asia/Beirut',
	'Asia/Dubai',
	'Asia/Jeddah',
	'Asia/Kuwait',
	'Asia/Muscat',
	'Asia/Qatar',
	'Asia/Riyadh',
]);
