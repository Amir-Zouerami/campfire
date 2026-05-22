import type { TimeReportGroupBy } from '@/types/domain';

/**
 * GlobalReportLoadState describes global report loading/export state.
 */
export type GlobalReportLoadState = 'idle' | 'loading' | 'exporting' | 'ready' | 'error';

/**
 * GlobalReportTab identifies one global report sub-page.
 */
export type GlobalReportTab = 'time' | 'leave';

/**
 * GlobalDateRange stores global report date filters.
 */
export type GlobalDateRange = {
	readonly startDate: string;
	readonly endDate: string;
};

/**
 * GlobalDateRangePatch updates part of a global report date range.
 */
export type GlobalDateRangePatch = Partial<GlobalDateRange>;

/**
 * GlobalTimeReportFilter stores global time report filters.
 */
export type GlobalTimeReportFilter = GlobalDateRange & {
	readonly groupBy: TimeReportGroupBy;
};

/**
 * GlobalTimeReportFilterPatch updates part of the global time report filter.
 */
export type GlobalTimeReportFilterPatch = Partial<GlobalTimeReportFilter>;
