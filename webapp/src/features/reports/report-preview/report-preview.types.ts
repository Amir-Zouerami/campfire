/**
 * ReportPreviewLoadState describes report preview loading/posting state.
 */
export type ReportPreviewLoadState = 'idle' | 'loading' | 'ready' | 'posting' | 'error';

/**
 * ReportPreviewKind identifies the preview workflow.
 */
export type ReportPreviewKind = 'daily' | 'weekly';
