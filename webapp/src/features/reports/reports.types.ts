import type { TranslationKey } from '@/i18n';

/**
 * ReportsSectionID identifies one report sub-page.
 */
export type ReportsSectionID = 'daily' | 'weekly' | 'time' | 'exports' | 'saved' | 'global';

/**
 * ReportsSection describes one reporting destination.
 */
export type ReportsSection = {
	readonly id: ReportsSectionID;
	readonly labelKey: TranslationKey;
	readonly descriptionKey: TranslationKey;
	readonly globalOnly: boolean;
};
