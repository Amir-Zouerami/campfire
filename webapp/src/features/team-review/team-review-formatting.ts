/**
 * formatWorkspaceDateTime renders an API UTC timestamp in the workspace timezone.
 */
export function formatWorkspaceDateTime(value: string, timezone: string, locale: string, fallback: string): string {
	const cleanValue = value.trim();
	if (cleanValue === '') {
		return fallback;
	}

	const date = new Date(cleanValue);
	if (Number.isNaN(date.getTime())) {
		return cleanValue;
	}

	const cleanTimezone = timezone.trim();

	try {
		return new Intl.DateTimeFormat(localeForCalendar(locale), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: cleanTimezone === '' ? undefined : cleanTimezone,
		}).format(date);
	} catch (_error: unknown) {
		return new Intl.DateTimeFormat(localeForCalendar(locale), {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(date);
	}
}

/**
 * formatWorkspaceLocalDate renders a stored YYYY-MM-DD local date for display.
 */
export function formatWorkspaceLocalDate(value: string, timezone: string, locale: string, fallback: string): string {
	const cleanValue = value.trim();
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanValue);
	if (match === null) {
		return cleanValue === '' ? fallback : cleanValue;
	}

	const year = Number.parseInt(match[1] ?? '', 10);
	const month = Number.parseInt(match[2] ?? '', 10);
	const day = Number.parseInt(match[3] ?? '', 10);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return cleanValue;
	}

	const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	const cleanTimezone = timezone.trim();

	try {
		return new Intl.DateTimeFormat(localeForCalendar(locale), {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: cleanTimezone === '' ? undefined : cleanTimezone,
		}).format(date);
	} catch (_error: unknown) {
		return new Intl.DateTimeFormat(localeForCalendar(locale), {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}
}

/**
 * localeForCalendar makes Persian UI dates use the Persian calendar consistently.
 */
function localeForCalendar(locale: string): string {
	const cleanLocale = locale.trim().toLowerCase();
	if (cleanLocale === 'fa' || cleanLocale.startsWith('fa-')) {
		return 'fa-IR-u-ca-persian';
	}

	return locale;
}
