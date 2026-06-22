/**
 * WorkingCalendarLoadState describes working calendar loading and mutation state.
 */
export type WorkingCalendarLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * WorkingCalendarFeedbackTone describes how local workflow feedback should render.
 */
export type WorkingCalendarFeedbackTone = 'success' | 'error';

/**
 * WeekdayOption describes one selectable weekday.
 */
export type WeekdayOption = {
	readonly weekday: number;
	readonly shortName: string;
	readonly longName: string;
};

/**
 * WorkspaceOffDayDraft stores the create workspace off-day form state.
 */
export type WorkspaceOffDayDraft = {
	readonly date: string;
	readonly label: string;
};

/**
 * WorkspaceOffDayDraftPatch updates part of the off-day form.
 */
export type WorkspaceOffDayDraftPatch = Partial<WorkspaceOffDayDraft>;
