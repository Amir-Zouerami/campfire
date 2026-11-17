import type { TranslationValues } from './types';

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * interpolate replaces `{name}` placeholders and leaves unknown ones untouched.
 */
export function interpolate(template: string, values: TranslationValues = {}): string {
	return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
		const value = values[key];

		return value === undefined ? match : String(value);
	});
}

/**
 * isolateBidi wraps mixed-direction dynamic text in Unicode first-strong isolates so
 * user-authored names never reorder the surrounding translated sentence.
 */
export function isolateBidi(value: string): string {
	return `⁨${value}⁩`;
}
