import { createContext, useContext, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { directionForLanguage, htmlLangForLanguage, normalizeLanguage } from './language';
import { translationCatalogs } from './messages';
import type { TranslationKey } from './messages';
import { interpolate } from './format';
import type { CampfireDirection, CampfireLanguage, TranslationValues } from './types';

/**
 * I18nContextValue is the localized runtime contract exposed to UI components.
 */
type I18nContextValue = {
	readonly language: CampfireLanguage;
	readonly direction: CampfireDirection;
	readonly htmlLang: string;
	readonly t: (key: TranslationKey, values?: TranslationValues) => string;
};

const defaultLanguage: CampfireLanguage = 'english';

const I18nContext = createContext<I18nContextValue>({
	language: defaultLanguage,
	direction: directionForLanguage(defaultLanguage),
	htmlLang: htmlLangForLanguage(defaultLanguage),
	t: (key: TranslationKey) => translationCatalogs[defaultLanguage][key] ?? String(key),
});

/**
 * I18nProvider makes Campfire's selected language and direction available to the UI.
 */
export function I18nProvider(props: {
	readonly language: CampfireLanguage;
	readonly children: ReactNode;
}): ReactElement {
	const language = normalizeLanguage(props.language, defaultLanguage);
	const value = useMemo<I18nContextValue>(() => {
		const catalog = translationCatalogs[language];
		const fallbackCatalog = translationCatalogs[defaultLanguage];

		return {
			language,
			direction: directionForLanguage(language),
			htmlLang: htmlLangForLanguage(language),
			t: (key: TranslationKey, values?: TranslationValues) => interpolate(catalog[key] ?? fallbackCatalog[key] ?? String(key), values),
		};
	}, [language]);

	return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

/**
 * useI18n returns Campfire's current localization helpers.
 */
export function useI18n(): I18nContextValue {
	return useContext(I18nContext);
}

