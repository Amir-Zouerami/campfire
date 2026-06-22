import type { TranslationKey } from '@/i18n';
import type { StandupSubmissionSortMode } from '@/types/domain';

/**
 * TeamStandupsLoadState describes the standup review page loading state.
 */
export type TeamStandupsLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * TeamStandupSortOption describes one supported review sort mode.
 */
export type TeamStandupSortOption = {
	readonly value: StandupSubmissionSortMode;
	readonly labelKey: TranslationKey;
	readonly helperKey: TranslationKey;
};
