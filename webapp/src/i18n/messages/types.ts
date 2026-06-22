import { englishMessages } from './en';

export type TranslationKey = keyof typeof englishMessages;
export type TranslationCatalog = Readonly<Record<TranslationKey, string>>;
