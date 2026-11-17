import { arabicMessages } from './ar';
import { englishMessages } from './en';
import { persianMessages } from './fa';
import type { TranslationCatalog } from './types';
import type { CampfireLanguage } from '../types';

export type { TranslationCatalog, TranslationKey } from './types';

export const translationCatalogs: Readonly<Record<CampfireLanguage, TranslationCatalog>> = {
	english: englishMessages,
	persian: persianMessages,
	arabic: arabicMessages,
};
