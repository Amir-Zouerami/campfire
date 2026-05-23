const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLASH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * normalizeISODateInputValue normalizes browser/user date values to YYYY-MM-DD.
 */
export function normalizeISODateInputValue(value: string): string {
	const cleanValue = value.trim();

	if (ISO_DATE_PATTERN.test(cleanValue)) {
		return cleanValue;
	}

	const slashMatch = cleanValue.match(SLASH_DATE_PATTERN);
	if (slashMatch !== null) {
		const month = slashMatch[1]?.padStart(2, '0') ?? '';
		const day = slashMatch[2]?.padStart(2, '0') ?? '';
		const year = slashMatch[3] ?? '';

		return `${year}-${month}-${day}`;
	}

	return cleanValue;
}

/**
 * isISODateInputValue returns true when a value is a real YYYY-MM-DD calendar date.
 */
export function isISODateInputValue(value: string): boolean {
	const cleanValue = normalizeISODateInputValue(value);

	if (!ISO_DATE_PATTERN.test(cleanValue)) {
		return false;
	}

	const [yearRaw, monthRaw, dayRaw] = cleanValue.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return false;
	}

	const date = new Date(year, month - 1, day);

	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
