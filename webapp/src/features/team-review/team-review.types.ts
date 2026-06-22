import type { TranslationKey } from '@/i18n';

/**
 * TeamReviewSectionID identifies one Team Review sub-page.
 */
export type TeamReviewSectionID = 'standups' | 'availability' | 'approvals' | 'runtime';

/**
 * TeamReviewSection describes one Team Review destination.
 */
export type TeamReviewSection = {
	readonly id: TeamReviewSectionID;
	readonly labelKey: TranslationKey;
	readonly descriptionKey: TranslationKey;
	readonly managerOnly: boolean;
	readonly approverOnly: boolean;
};
