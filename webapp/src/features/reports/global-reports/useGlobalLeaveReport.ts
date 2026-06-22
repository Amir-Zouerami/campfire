import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { exportGlobalLeaveReportCSV, getGlobalLeaveReportSummary } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
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
 * useGlobalLeaveReport owns range drafts and query-backed global leave loading.
 */
export function useGlobalLeaveReport(isSystemAdmin: boolean): UseGlobalLeaveReportResult {
	const { t } = useI18n();
	const [range, setRange] = useState<GlobalDateRange>(defaultGlobalDateRange);
	const [queryRange, setQueryRange] = useState<GlobalDateRange | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [manualError, setManualError] = useState('');
	const [manualMessage, setManualMessage] = useState('');

	const reportQuery = useQuery({
		queryKey: campfireQueryKeys.globalLeaveReportSummary(
			queryRange?.startDate ?? '',
			queryRange?.endDate ?? '',
			refreshToken,
		),
		queryFn: async (): Promise<GlobalLeaveReportSummary> => {
			if (queryRange === null) {
				throw new Error(t('reports.global.validation.loadReportFirst'));
			}

			const response = await getGlobalLeaveReportSummary(queryRange.startDate, queryRange.endDate);

			return response.summary;
		},
		enabled: queryRange !== null,
	});

	const exportMutation = useMutation({
		mutationFn: async (exportRange: GlobalDateRange): Promise<void> => {
			const blob = await exportGlobalLeaveReportCSV(exportRange.startDate, exportRange.endDate);

			downloadGlobalCSVBlob(blob, buildGlobalExportFilename('campfire-global-leaves', exportRange));
		},
		onSuccess: () => {
			setManualError('');
			setManualMessage(t('reports.global.leave.csv.downloaded'));
			toast.success(t('reports.global.leave.csv.downloaded'));
		},
		onError: (error: unknown) => {
			const errorMessage = errorToMessage(error, t('reports.global.error.fallback'));

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

	const summary = reportQuery.data ?? null;
	const userIDsForProfiles = useMemo(() => collectGlobalLeaveUserIDs(summary), [summary]);
	const queryErrorMessage = reportQuery.isError
		? errorToMessage(reportQuery.error, t('reports.global.error.fallback'))
		: '';
	const message = manualError || queryErrorMessage || manualMessage;
	const loadState = resolveGlobalReportLoadState({
		manualError,
		queryErrorMessage,
		queryLoading: reportQuery.isFetching,
		exporting: exportMutation.isPending,
		queryLoaded: queryRange !== null && summary !== null,
	});

	/**
	 * updateRange patches global leave report filters.
	 */
	function updateRange(patch: GlobalDateRangePatch): void {
		setManualError('');
		setManualMessage('');
		setRange(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport validates the draft and runs the global leave query.
	 */
	async function loadReport(): Promise<void> {
		if (!isSystemAdmin) {
			setManualMessage('');
			setManualError(t('reports.global.leave.permission.view'));
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(range);
		const validationMessage = validateGlobalDateRange(normalizedRange, t);

		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setRange(normalizedRange);
		setQueryRange(normalizedRange);
		setRefreshToken(current => current + 1);
	}

	/**
	 * exportCSV downloads the current global leave report CSV.
	 */
	async function exportCSV(): Promise<void> {
		if (!isSystemAdmin) {
			setManualMessage('');
			setManualError(t('reports.global.leave.permission.export'));
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(range);
		const validationMessage = validateGlobalDateRange(normalizedRange, t);

		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setRange(normalizedRange);
		await exportMutation.mutateAsync(normalizedRange);
	}

	return {
		loadState,
		range,
		summary,
		message,
		isBusy: reportQuery.isFetching || exportMutation.isPending,
		userIDsForProfiles,
		updateRange,
		loadReport,
		exportCSV,
	};
}

/**
 * resolveGlobalReportLoadState maps query/mutation state into UI state.
 */
function resolveGlobalReportLoadState(input: {
	readonly manualError: string;
	readonly queryErrorMessage: string;
	readonly queryLoading: boolean;
	readonly exporting: boolean;
	readonly queryLoaded: boolean;
}): GlobalReportLoadState {
	if (input.manualError !== '' || input.queryErrorMessage !== '') {
		return 'error';
	}

	if (input.exporting) {
		return 'exporting';
	}

	if (input.queryLoading) {
		return 'loading';
	}

	if (input.queryLoaded) {
		return 'ready';
	}

	return 'idle';
}
