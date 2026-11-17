import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, oppositeTheme, parseTheme } from './theme';

describe('parseTheme', () => {
	it('accepts the two themes regardless of case and spacing', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme(' Light ')).toBe('light');
	});

	it('returns null for unset or unknown values so the default applies', () => {
		expect(parseTheme(null)).toBeNull();
		expect(parseTheme(undefined)).toBeNull();
		expect(parseTheme('')).toBeNull();
		expect(parseTheme('auto')).toBeNull();
	});
});

describe('theme defaults', () => {
	it('defaults to dark', () => {
		expect(DEFAULT_THEME).toBe('dark');
	});

	it('toggles between the two themes', () => {
		expect(oppositeTheme('dark')).toBe('light');
		expect(oppositeTheme('light')).toBe('dark');
	});
});
