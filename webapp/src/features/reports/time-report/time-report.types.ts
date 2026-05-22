import type { TimeReportGroupBy } from '@/types/domain';

/**
 * TimeReportLoadState describes workspace time report loading state.
 */
export type TimeReportLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * TimeReportFilterDraft stores the editable time report filters.
 */
export type TimeReportFilterDraft = {
	readonly startDate: string;
	readonly endDate: string;
	readonly groupBy: TimeReportGroupBy;
};

/**
 * TimeReportFilterPatch updates part of the time report filters.
 */
export type TimeReportFilterPatch = Partial<TimeReportFilterDraft>;

/**
 * TimeReportSavedFilter stores parsed saved-filter data for time reports.
 */
export type TimeReportSavedFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly groupBy?: TimeReportGroupBy;
};
