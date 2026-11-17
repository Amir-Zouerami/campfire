/**
 * isRecord narrows unknown values to string-keyed records.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * cleanString trims optional text and collapses missing values to an empty string.
 */
export function cleanString(value: string | null | undefined): string {
	return value?.trim() ?? '';
}

/**
 * uniqueStrings returns trimmed, non-empty, de-duplicated strings in first-seen order.
 */
export function uniqueStrings(values: readonly (string | null | undefined)[]): readonly string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const clean = cleanString(value);
		if (clean === '' || seen.has(clean)) {
			continue;
		}

		seen.add(clean);
		result.push(clean);
	}

	return result;
}
