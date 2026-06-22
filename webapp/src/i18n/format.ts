import type { TranslationValues } from './types';

const interpolationPattern = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * interpolate replaces named placeholders while keeping translation strings plain.
 */
export function interpolate(template: string, values: TranslationValues = {}): string {
	return template.replace(interpolationPattern, (match: string, key: string): string => {
		const value = values[key];
		if (value === undefined) {
			return match;
		}

		return String(value);
	});
}

/**
 * isolateBidiText wraps mixed-direction dynamic text in Unicode isolates.
 */
export function isolateBidiText(value: string): string {
	return `\u2068${value}\u2069`;
}
