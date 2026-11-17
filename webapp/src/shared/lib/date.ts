/**
 * IsoDate is a canonical Gregorian calendar date, formatted YYYY-MM-DD.
 *
 * Campfire stores every date as a Gregorian local date in the workspace
 * timezone. All arithmetic here runs on UTC components so daylight-saving
 * transitions can never shift a calendar day.
 */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * WeekRange is an inclusive first/last date pair.
 */
export type DateRange = {
	readonly startDate: IsoDate;
	readonly endDate: IsoDate;
};

/**
 * parseIsoDate converts YYYY-MM-DD into a UTC-noon Date, or null when invalid.
 */
export function parseIsoDate(value: string): Date | null {
	const match = ISO_DATE_PATTERN.exec(value.trim());
	if (match === null) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day, 12));

	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return null;
	}

	return date;
}

/**
 * isIsoDate reports whether a value is a real YYYY-MM-DD calendar date.
 */
export function isIsoDate(value: string): boolean {
	return parseIsoDate(value) !== null;
}

/**
 * toIsoDate formats a Date's UTC components as YYYY-MM-DD.
 */
export function toIsoDate(date: Date): IsoDate {
	const year = String(date.getUTCFullYear()).padStart(4, '0');
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * addDays returns a date offset by whole days. Invalid input is returned unchanged.
 */
export function addDays(value: IsoDate, days: number): IsoDate {
	const date = parseIsoDate(value);
	if (date === null) {
		return value;
	}

	return toIsoDate(new Date(date.getTime() + days * MILLISECONDS_PER_DAY));
}

/**
 * diffInDays returns end - start in whole days.
 */
export function diffInDays(start: IsoDate, end: IsoDate): number {
	const startDate = parseIsoDate(start);
	const endDate = parseIsoDate(end);
	if (startDate === null || endDate === null) {
		return 0;
	}

	return Math.round((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY);
}

/**
 * weekdayOf returns 0 (Sunday) through 6 (Saturday), matching the backend numbering.
 */
export function weekdayOf(value: IsoDate): number {
	return parseIsoDate(value)?.getUTCDay() ?? 0;
}

/**
 * eachDate lists every date from start to end inclusive, capped to keep callers safe.
 */
export function eachDate(start: IsoDate, end: IsoDate, maxDays = 400): readonly IsoDate[] {
	const total = Math.min(Math.max(diffInDays(start, end) + 1, 0), maxDays);

	return Array.from({ length: total }, (_unused, index) => addDays(start, index));
}

/**
 * todayIn returns today's calendar date in an IANA timezone, falling back to the browser clock.
 */
export function todayIn(timezone: string | null | undefined, now: Date = new Date()): IsoDate {
	const zone = timezone?.trim() ?? '';

	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: zone === '' ? undefined : zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(now);
		const pick = (type: string): string => parts.find(part => part.type === type)?.value ?? '';
		const iso = `${pick('year')}-${pick('month')}-${pick('day')}`;

		return isIsoDate(iso) ? iso : toIsoDate(now);
	} catch {
		return toIsoDate(now);
	}
}

/**
 * weekStartFor mirrors the backend week order: Saturday for Tehran, Monday elsewhere.
 */
export function weekStartFor(timezone: string | null | undefined): number {
	return timezone?.trim() === 'Asia/Tehran' ? 6 : 1;
}

/**
 * weekRangeOf returns the seven-day range that contains a date.
 */
export function weekRangeOf(value: IsoDate, weekStart: number): DateRange {
	const offset = (weekdayOf(value) - weekStart + 7) % 7;
	const startDate = addDays(value, -offset);

	return { startDate, endDate: addDays(startDate, 6) };
}

/**
 * compareIsoDates orders two dates ascending.
 */
export function compareIsoDates(first: IsoDate, second: IsoDate): number {
	return first < second ? -1 : first > second ? 1 : 0;
}

/**
 * rangesOverlap reports whether two inclusive date ranges share a day.
 */
export function rangesOverlap(first: DateRange, second: DateRange): boolean {
	return first.startDate <= second.endDate && second.startDate <= first.endDate;
}

/**
 * formatDate renders a stored date in the UI locale (always on the Gregorian calendar).
 */
export function formatDate(value: IsoDate, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
	const date = parseIsoDate(value);
	if (date === null) {
		return value;
	}

	return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC', calendar: 'gregory' }).format(date);
}

/**
 * formatTimestamp renders an RFC 3339 timestamp, optionally in a workspace timezone.
 */
export function formatTimestamp(value: string, locale: string, timezone?: string): string {
	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) {
		return value;
	}

	try {
		return new Intl.DateTimeFormat(locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: timezone === undefined || timezone.trim() === '' ? undefined : timezone,
			calendar: 'gregory',
		}).format(new Date(timestamp));
	} catch {
		return value;
	}
}

/**
 * persianDateLabel renders the Jalali equivalent of a stored Gregorian date, e.g. "25 آبان 1405".
 */
export function persianDateLabel(value: IsoDate): string {
	const date = parseIsoDate(value);
	if (date === null) {
		return '';
	}

	try {
		return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}).format(date);
	} catch {
		return '';
	}
}

/**
 * toLocalNoonDate converts a stored date into a local-noon Date for calendar widgets,
 * which operate in the browser's local time.
 */
export function toLocalNoonDate(value: IsoDate): Date | undefined {
	const date = parseIsoDate(value);
	if (date === null) {
		return undefined;
	}

	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12);
}

/**
 * fromLocalDate converts a calendar widget's local Date back to a stored date.
 */
export function fromLocalDate(date: Date): IsoDate {
	return toIsoDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
}

/**
 * normalizeDateInput accepts YYYY-MM-DD and M/D/YYYY typed by a person and returns YYYY-MM-DD,
 * or null when the text is not a real calendar date.
 */
export function normalizeDateInput(value: string): IsoDate | null {
	const text = value.trim();
	const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
	const candidate = slash === null ? text : `${slash[3]}-${(slash[1] ?? '').padStart(2, '0')}-${(slash[2] ?? '').padStart(2, '0')}`;

	return isIsoDate(candidate) ? candidate : null;
}

/**
 * calendarLabelsFor builds the alternate-calendar labels the server embeds in report Markdown.
 * Campfire stores Gregorian dates; for Persian (Tehran) workspaces the browser renders the
 * Jalali label because it has the ICU calendar data and the Go server does not.
 */
export function calendarLabelsFor(dates: readonly IsoDate[], timezone: string | null | undefined): Readonly<Record<IsoDate, string>> {
	if (timezone?.trim() !== 'Asia/Tehran') {
		return {};
	}

	const labels: Record<IsoDate, string> = {};
	for (const date of dates) {
		const label = persianDateLabel(date);
		if (label !== '') {
			labels[date] = label;
		}
	}

	return labels;
}
