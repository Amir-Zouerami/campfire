import type { TranslationKey } from './messages';

/**
 * CampfireLanguage identifies the generated UI/message language supported by
 * Campfire's internal localization layer.
 */
export type CampfireLanguage = 'english' | 'persian' | 'arabic';

/**
 * CampfireDirection identifies the base layout direction for a language.
 */
export type CampfireDirection = 'ltr' | 'rtl';

/**
 * TranslationValues are interpolation values for translated strings.
 */
export type TranslationValues = Readonly<Record<string, string | number | boolean>>;

/**
 * TFunction is the typed translation function consumed by feature helpers.
 */
export type TFunction = (key: TranslationKey, values?: TranslationValues) => string;

/**
 * campfireLanguages is the canonical frontend language order.
 */
export const campfireLanguages = ['english', 'persian', 'arabic'] as const;
