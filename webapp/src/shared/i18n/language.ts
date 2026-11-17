import type { CampfireLanguage, Direction, LanguagePreference } from './types';

const arabicTimezones = new Set([
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

/**
 * parseLanguage returns a supported language, or null for unknown values.
 */
export function parseLanguage(value: string | null | undefined): CampfireLanguage | null {
	switch (value?.trim().toLowerCase()) {
		case 'english':
			return 'english';
		case 'persian':
			return 'persian';
		case 'arabic':
			return 'arabic';
		default:
			return null;
	}
}

/**
 * parseLanguagePreference returns a stored preference, treating anything unknown as `auto`.
 */
export function parseLanguagePreference(value: string | null | undefined): LanguagePreference {
	return parseLanguage(value) ?? 'auto';
}

/**
 * inferLanguageFromTimezone returns the default language for a timezone.
 */
export function inferLanguageFromTimezone(timezone: string | null | undefined): CampfireLanguage {
	const zone = timezone?.trim() ?? '';

	if (zone === 'Asia/Tehran') {
		return 'persian';
	}

	return arabicTimezones.has(zone) ? 'arabic' : 'english';
}

/**
 * ResolveLanguageInput carries everything that influences the UI language.
 */
export type ResolveLanguageInput = {
	/** The signed-in user's explicit choice. */
	readonly preference: LanguagePreference;
	/** The workspace's generated-message language, when a workspace is loaded. */
	readonly workspaceLanguage: string | null | undefined;
	/** The workspace timezone, when a workspace is loaded. */
	readonly workspaceTimezone: string | null | undefined;
	/** The browser timezone, used before any workspace is known. */
	readonly browserTimezone: string;
};

/**
 * resolveLanguage applies Campfire's language precedence:
 * user preference, then the workspace language, then the workspace timezone,
 * then the browser timezone.
 */
export function resolveLanguage(input: ResolveLanguageInput): CampfireLanguage {
	if (input.preference !== 'auto') {
		return input.preference;
	}

	const workspaceLanguage = parseLanguage(input.workspaceLanguage);
	if (workspaceLanguage !== null) {
		return workspaceLanguage;
	}

	return inferLanguageFromTimezone(input.workspaceTimezone ?? input.browserTimezone);
}

/**
 * directionOf returns the base layout direction for a language.
 */
export function directionOf(language: CampfireLanguage): Direction {
	return language === 'english' ? 'ltr' : 'rtl';
}

/**
 * htmlLangOf returns the BCP 47 tag for a language.
 */
export function htmlLangOf(language: CampfireLanguage): string {
	switch (language) {
		case 'persian':
			return 'fa';
		case 'arabic':
			return 'ar';
		case 'english':
			return 'en';
	}
}

/**
 * browserTimezone returns the runtime IANA timezone.
 */
export function browserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/**
 * languageNativeName names a language in itself, so a person can find theirs even when the
 * interface is in a language they cannot read.
 */
export function languageNativeName(language: CampfireLanguage): string {
	switch (language) {
		case 'persian':
			return 'فارسی';
		case 'arabic':
			return 'العربية';
		case 'english':
			return 'English';
	}
}
