/**
 * GlobalOffDaysLoadState describes global off-day loading and mutation state.
 */
export type GlobalOffDaysLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * GlobalOffDayDraft stores the create global off-day form.
 */
export type GlobalOffDayDraft = {
	readonly date: string;
	readonly label: string;
};

/**
 * GlobalOffDayDraftPatch updates part of the global off-day form.
 */
export type GlobalOffDayDraftPatch = Partial<GlobalOffDayDraft>;
