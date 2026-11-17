import type { TranslationKey } from './messages';

/**
 * CampfireLanguage identifies a language Campfire can render and generate messages in.
 * These values match the backend's `language` enum.
 */
export type CampfireLanguage = 'english' | 'persian' | 'arabic';

/**
 * LanguagePreference is a user's UI language choice. `auto` follows the workspace
 * language, which itself defaults to a language inferred from the workspace timezone.
 */
export type LanguagePreference = 'auto' | CampfireLanguage;

/**
 * Direction is the base layout direction of a language.
 */
export type Direction = 'ltr' | 'rtl';

/**
 * TranslationValues are interpolation values for translated strings.
 */
export type TranslationValues = Readonly<Record<string, string | number | boolean>>;

/**
 * TFunction is the typed translation function.
 */
export type TFunction = (key: TranslationKey, values?: TranslationValues) => string;

/**
 * languages is the canonical language order.
 */
export const languages = ['english', 'persian', 'arabic'] as const satisfies readonly CampfireLanguage[];
