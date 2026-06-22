import type { CampfireDirection, CampfireLanguage } from './types';

const arabicLanguageTimezones = new Set([
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
 * normalizeLanguage returns a supported Campfire language with a caller-owned fallback.
 */
export function normalizeLanguage(value: string | null | undefined, fallback: CampfireLanguage): CampfireLanguage {
	switch (value?.trim().toLowerCase()) {
		case 'persian':
			return 'persian';
		case 'arabic':
			return 'arabic';
		case 'english':
			return 'english';
		default:
			return fallback;
	}
}

/**
 * inferLanguageFromTimezone returns the default UI/generated-message language for a timezone.
 */
export function inferLanguageFromTimezone(timezone: string | null | undefined): CampfireLanguage {
	const cleanTimezone = timezone?.trim() ?? '';

	if (cleanTimezone === 'Asia/Tehran') {
		return 'persian';
	}

	if (arabicLanguageTimezones.has(cleanTimezone)) {
		return 'arabic';
	}

	return 'english';
}

/**
 * directionForLanguage returns the base layout direction for a language.
 */
export function directionForLanguage(language: CampfireLanguage): CampfireDirection {
	switch (language) {
		case 'persian':
		case 'arabic':
			return 'rtl';
		case 'english':
			return 'ltr';
	}
}

/**
 * htmlLangForLanguage returns the best HTML lang code for a Campfire language.
 */
export function htmlLangForLanguage(language: CampfireLanguage): string {
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
 * getBrowserTimezone returns the runtime IANA timezone when available.
 */
export function getBrowserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch (_error: unknown) {
		return 'UTC';
	}
}
