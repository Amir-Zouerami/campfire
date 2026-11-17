import { createContext, use } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { formatDate, formatTimestamp } from '@/shared/lib/date';

import { interpolate } from './format';
import { directionOf, htmlLangOf } from './language';
import { translationCatalogs } from './messages';
import type { TranslationKey } from './messages';
import type { CampfireLanguage, Direction, TFunction, TranslationValues } from './types';

const LOCALES: Readonly<Record<CampfireLanguage, string>> = {
	english: 'en',
	persian: 'fa-IR',
	arabic: 'ar',
};

/**
 * I18nValue is everything a component needs to render localized text and values.
 */
export type I18nValue = {
	readonly language: CampfireLanguage;
	readonly direction: Direction;
	readonly isRtl: boolean;
	readonly htmlLang: string;
	/** BCP 47 locale for Intl formatters. */
	readonly locale: string;
	readonly t: TFunction;
	/**
	 * Translates a message if it is a catalog key, otherwise returns it unchanged. Validation
	 * schemas use translation keys as their error messages; server messages pass through.
	 */
	readonly translateIfKey: (message: string) => string;
	/** Formats a stored YYYY-MM-DD date in the UI language. */
	readonly formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
	/** Formats an RFC 3339 timestamp, optionally in a workspace timezone. */
	readonly formatTimestamp: (value: string, timezone?: string) => string;
	/** Formats minutes as a localized duration ("1h 30m"). */
	readonly formatDuration: (minutes: number) => string;
	/** Formats a count with the UI language's digits and grouping. */
	readonly formatNumber: (value: number) => string;
};

/**
 * createI18nValue builds the localization helpers for one language.
 */
export function createI18nValue(language: CampfireLanguage): I18nValue {
	const catalog = translationCatalogs[language];
	const fallback = translationCatalogs.english;
	const locale = LOCALES[language];
	const direction = directionOf(language);

	const t: TFunction = (key: TranslationKey, values?: TranslationValues) =>
		interpolate(catalog[key] ?? fallback[key] ?? String(key), values);

	return {
		language,
		direction,
		isRtl: direction === 'rtl',
		htmlLang: htmlLangOf(language),
		locale,
		t,
		translateIfKey: message => (message in catalog ? t(message as TranslationKey) : message),
		formatDate: (value, options) => formatDate(value, locale, options),
		formatTimestamp: (value, timezone) => formatTimestamp(value, locale, timezone),
		formatNumber: value => new Intl.NumberFormat(locale).format(value),
		formatDuration: minutes => {
			const total = Math.max(0, Math.round(minutes));
			const hours = Math.floor(total / 60);
			const remainder = total % 60;

			if (hours === 0) {
				return t('myDay.time.duration.minutes', { minutes: remainder });
			}

			return remainder === 0
				? t('myDay.time.duration.hours', { hours })
				: t('myDay.time.duration.hoursMinutes', { hours, minutes: remainder });
		},
	};
}

const I18nContext = createContext<I18nValue>(createI18nValue('english'));

/**
 * I18nProvider makes the selected language, direction and formatters available to the UI.
 */
export function I18nProvider(props: { readonly language: CampfireLanguage; readonly children: ReactNode }): ReactElement {
	return <I18nContext value={createI18nValue(props.language)}>{props.children}</I18nContext>;
}

/**
 * useI18n returns the localization helpers for the current language.
 */
export function useI18n(): I18nValue {
	return use(I18nContext);
}
