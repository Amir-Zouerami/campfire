import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { exportGlobalTimeReportCSV, getGlobalTimeReportSummary } from '@/api';
import type { GlobalTimeReportSummary } from '@/types/domain';

import {
	buildGlobalExportFilename,
	collectGlobalTimeUserIDs,
	defaultGlobalTimeFilter,
	downloadGlobalCSVBlob,
	errorToMessage,
	validateGlobalDateRange,
} from './global-reports.helpers';
import type {
	GlobalReportLoadState,
	GlobalTimeReportFilter,
	GlobalTimeReportFilterPatch,
} from './global-reports.types';

/**
 * UseGlobalTimeReportResult contains global time report state and actions.
 */
export type UseGlobalTimeReportResult = {
	readonly loadState: GlobalReportLoadState;
	readonly filter: GlobalTimeReportFilter;
	readonly summary: GlobalTimeReportSummary | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly userIDsForProfiles: readonly string[];
	readonly updateFilter: (patch: GlobalTimeReportFilterPatch) => void;
	readonly loadReport: () => Promise<void>;
	readonly exportCSV: () => Promise<void>;
};

/**
 * useGlobalTimeReport owns global time report loading and CSV export.
 */
export function useGlobalTimeReport(isSystemAdmin: boolean): UseGlobalTimeReportResult {
	const [loadState, setLoadState] = useState<GlobalReportLoadState>('idle');
	const [filter, setFilter] = useState<GlobalTimeReportFilter>(defaultGlobalTimeFilter);
	const [summary, setSummary] = useState<GlobalTimeReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const userIDsForProfiles = useMemo(() => collectGlobalTimeUserIDs(summary), [summary]);
	const isBusy = loadState === 'loading' || loadState === 'exporting';

	/**
	 * updateFilter patches global time report filters.
	 */
	function updateFilter(patch: GlobalTimeReportFilterPatch): void {
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport loads the global time report.
	 */
	async function loadReport(): Promise<void> {
		if (!isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can view global time reports.');
			return;
		}

		const validationMessage = validateGlobalDateRange(filter);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getGlobalTimeReportSummary(filter.startDate, filter.endDate, filter.groupBy);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Global time report loaded.');
		} catch (error: unknown) {
			setSummary(null);
			setLoadState('error');
			setMessage(errorToMessage(error));
		}
	}

	/**
	 * exportCSV exports the global time report as CSV.
	 */
	async function exportCSV(): Promise<void> {
		if (!isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can export global time reports.');
			return;
		}

		const validationMessage = validateGlobalDateRange(filter);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('exporting');
		setMessage('');

		try {
			const blob = await exportGlobalTimeReportCSV(filter.startDate, filter.endDate, filter.groupBy);

			downloadGlobalCSVBlob(blob, buildGlobalExportFilename('campfire-global-time', filter));
			setLoadState('ready');
			setMessage('Global time CSV downloaded.');
			toast.success('Global time CSV downloaded');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		filter,
		summary,
		message,
		isBusy,
		userIDsForProfiles,
		updateFilter,
		loadReport,
		exportCSV,
	};
}
