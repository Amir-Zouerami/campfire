import { describe, expect, it } from 'vitest';

import { translationCatalogs } from './messages';

/**
 * placeholders lists the {name} interpolation slots of a message, sorted.
 */
function placeholders(message: string): readonly string[] {
	return [...message.matchAll(/\{(\w+)\}/g)].map(match => match[1] ?? '').sort();
}

describe('translation catalogs', () => {
	const english = translationCatalogs.english;
	const keys = Object.keys(english);

	for (const language of ['persian', 'arabic'] as const) {
		const catalog: Readonly<Record<string, string>> = translationCatalogs[language];

		it(`${language} has exactly the English keys`, () => {
			expect(Object.keys(catalog).filter(key => !(key in english))).toEqual([]);
			expect(keys.filter(key => !(key in catalog))).toEqual([]);
		});

		it(`${language} messages are filled and keep the same placeholders`, () => {
			const problems = keys.filter(key => {
				const message = catalog[key];

				return (
					message === undefined ||
					message.trim() === '' ||
					placeholders(message).join() !== placeholders(english[key as keyof typeof english]).join()
				);
			});

			expect(problems).toEqual([]);
		});
	}
});
