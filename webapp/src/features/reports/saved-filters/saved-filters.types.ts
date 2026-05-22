import type { ReportKind } from '@/types/domain';

/**
 * SavedFiltersLoadState describes saved-filter page loading and mutation state.
 */
export type SavedFiltersLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * SavedFilterDraft stores the create-filter form state.
 */
export type SavedFilterDraft = {
	readonly name: string;
	readonly reportType: ReportKind;
	readonly filterJson: string;
};

/**
 * SavedFilterDraftPatch updates part of the saved-filter form.
 */
export type SavedFilterDraftPatch = Partial<SavedFilterDraft>;
