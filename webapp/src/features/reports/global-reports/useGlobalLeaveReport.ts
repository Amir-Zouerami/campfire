import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { exportGlobalLeaveReportCSV, getGlobalLeaveReportSummary } from '@/api';
import type { GlobalLeaveReportSummary } from '@/types/domain';

import {
	buildGlobalExportFilename,
	collectGlobalLeaveUserIDs,
	defaultGlobalDateRange,
	downloadGlobalCSVBlob,
	errorToMessage,
	normalizeGlobalDateRange,
	validateGlobalDateRange,
} from './global-reports.helpers';
import type { GlobalDateRange, GlobalDateRangePatch, GlobalReportLoadState } from './global-reports.types';

/**
 * UseGlobalLeaveReportResult contains global leave report state and actions.
 */
export type UseGlobalLeaveReportResult = {
	readonly loadState: GlobalReportLoadState;
	readonly range: GlobalDateRange;
	readonly summary: GlobalLeaveReportSummary | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly userIDsForProfiles: readonly string[];
	readonly updateRange: (patch: GlobalDateRangePatch) => void;
	readonly loadReport: () => Promise<void>;
	readonly exportCSV: () => Promise<void>;
};

/**
 * useGlobalLeaveReport owns global leave report loading and CSV export.
 */
export function useGlobalLeaveReport(isSystemAdmin: boolean): UseGlobalLeaveReportResult {
	const [loadState, setLoadState] = useState<GlobalReportLoadState>('idle');
	const [range, setRange] = useState<GlobalDateRange>(defaultGlobalDateRange);
	const [summary, setSummary] = useState<GlobalLeaveReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const userIDsForProfiles = useMemo(() => collectGlobalLeaveUserIDs(summary), [summary]);
	const isBusy = loadState === 'loading' || loadState === 'exporting';

	/**
	 * updateRange patches global leave report filters.
	 */
	function updateRange(patch: GlobalDateRangePatch): void {
		setRange(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport loads the global leave report.
	 */
	async function loadReport(): Promise<void> {
		if (!isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can view global leave reports.');
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(range);
		const validationMessage = validateGlobalDateRange(normalizedRange);

		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setRange(normalizedRange);
		setLoadState('loading');
		setMessage('');

		try {
			const response = await getGlobalLeaveReportSummary(normalizedRange.startDate, normalizedRange.endDate);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Global leave report loaded.');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setSummary(null);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * exportCSV downloads the current global leave report CSV.
	 */
	async function exportCSV(): Promise<void> {
		if (!isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can export global leave reports.');
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(range);
		const validationMessage = validateGlobalDateRange(normalizedRange);

		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setRange(normalizedRange);
		setLoadState('exporting');
		setMessage('');

		try {
			const blob = await exportGlobalLeaveReportCSV(normalizedRange.startDate, normalizedRange.endDate);

			downloadGlobalCSVBlob(blob, buildGlobalExportFilename('campfire-global-leaves', normalizedRange));
			setLoadState('ready');
			setMessage('Global leave CSV downloaded.');
			toast.success('Global leave CSV downloaded');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		range,
		summary,
		message,
		isBusy,
		userIDsForProfiles,
		updateRange,
		loadReport,
		exportCSV,
	};
}
