import { describe, expect, it } from 'vitest';

import { directionOf, inferLanguageFromTimezone, parseLanguagePreference, resolveLanguage } from './language';

const base = { workspaceLanguage: undefined, workspaceTimezone: undefined, browserTimezone: 'Europe/Berlin' } as const;

describe('resolveLanguage', () => {
	it('lets an explicit user preference win over everything', () => {
		expect(resolveLanguage({ ...base, preference: 'english', workspaceLanguage: 'persian', workspaceTimezone: 'Asia/Tehran' })).toBe(
			'english',
		);
	});

	it('follows the workspace language when the user has no preference', () => {
		expect(resolveLanguage({ ...base, preference: 'auto', workspaceLanguage: 'arabic', workspaceTimezone: 'Asia/Tehran' })).toBe('arabic');
	});

	it('falls back to the workspace timezone, then the browser timezone', () => {
		expect(resolveLanguage({ ...base, preference: 'auto', workspaceTimezone: 'Asia/Tehran' })).toBe('persian');
		expect(resolveLanguage({ ...base, preference: 'auto', browserTimezone: 'Asia/Tehran' })).toBe('persian');
		expect(resolveLanguage({ ...base, preference: 'auto' })).toBe('english');
	});

	it('treats unknown stored values as auto', () => {
		expect(parseLanguagePreference('klingon')).toBe('auto');
		expect(parseLanguagePreference(null)).toBe('auto');
		expect(parseLanguagePreference('Persian')).toBe('persian');
	});

	it('maps languages to layout direction and timezone defaults', () => {
		expect(directionOf('persian')).toBe('rtl');
		expect(directionOf('english')).toBe('ltr');
		expect(inferLanguageFromTimezone('Asia/Riyadh')).toBe('arabic');
	});
});
