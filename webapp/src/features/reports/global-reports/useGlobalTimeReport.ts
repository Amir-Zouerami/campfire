import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { exportGlobalTimeReportCSV, getGlobalTimeReportSummary } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { GlobalTimeReportSummary } from '@/types/domain';

import {
	buildGlobalExportFilename,
	collectGlobalTimeUserIDs,
	defaultGlobalTimeFilter,
	downloadGlobalCSVBlob,
	errorToMessage,
	normalizeGlobalDateRange,
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
 * useGlobalTimeReport owns filter drafts and query-backed global time loading.
 *
 * Global reports remain explicit-load because they can span every workspace in
 * the Mattermost instance and should not refetch on every draft keystroke.
 */
export function useGlobalTimeReport(isSystemAdmin: boolean): UseGlobalTimeReportResult {
	const { t } = useI18n();
	const [filter, setFilter] = useState<GlobalTimeReportFilter>(defaultGlobalTimeFilter);
	const [queryFilter, setQueryFilter] = useState<GlobalTimeReportFilter | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [manualError, setManualError] = useState('');
	const [manualMessage, setManualMessage] = useState('');

	const reportQuery = useQuery({
		queryKey: campfireQueryKeys.globalTimeReportSummary(
			queryFilter?.startDate ?? '',
			queryFilter?.endDate ?? '',
			queryFilter?.groupBy ?? 'person',
			refreshToken,
		),
		queryFn: async (): Promise<GlobalTimeReportSummary> => {
			if (queryFilter === null) {
				throw new Error(t('reports.global.validation.loadReportFirst'));
			}

			const response = await getGlobalTimeReportSummary(
				queryFilter.startDate,
				queryFilter.endDate,
				queryFilter.groupBy,
			);

			return response.summary;
		},
		enabled: queryFilter !== null,
	});

	const exportMutation = useMutation({
		mutationFn: async (exportFilter: GlobalTimeReportFilter): Promise<void> => {
			const blob = await exportGlobalTimeReportCSV(
				exportFilter.startDate,
				exportFilter.endDate,
				exportFilter.groupBy,
			);

			downloadGlobalCSVBlob(blob, buildGlobalExportFilename('campfire-global-time', exportFilter));
		},
		onSuccess: () => {
			setManualError('');
			setManualMessage(t('reports.global.time.csv.downloaded'));
			toast.success(t('reports.global.time.csv.downloaded'));
		},
		onError: (error: unknown) => {
			const errorMessage = errorToMessage(error, t('reports.global.error.fallback'));

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

	const summary = reportQuery.data ?? null;
	const userIDsForProfiles = useMemo(() => collectGlobalTimeUserIDs(summary), [summary]);
	const queryErrorMessage = reportQuery.isError
		? errorToMessage(reportQuery.error, t('reports.global.error.fallback'))
		: '';
	const message = manualError || queryErrorMessage || manualMessage;
	const loadState = resolveGlobalReportLoadState({
		manualError,
		queryErrorMessage,
		queryLoading: reportQuery.isFetching,
		exporting: exportMutation.isPending,
		queryLoaded: queryFilter !== null && summary !== null,
	});

	/**
	 * updateFilter patches global time report filters.
	 */
	function updateFilter(patch: GlobalTimeReportFilterPatch): void {
		setManualError('');
		setManualMessage('');
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport validates the draft and runs the global time query.
	 */
	async function loadReport(): Promise<void> {
		if (!isSystemAdmin) {
			setManualMessage('');
			setManualError(t('reports.global.time.permission.view'));
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(filter);
		const normalizedFilter: GlobalTimeReportFilter = {
			...filter,
			...normalizedRange,
		};
		const validationMessage = validateGlobalDateRange(normalizedFilter, t);

		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setFilter(normalizedFilter);
		setQueryFilter(normalizedFilter);
		setRefreshToken(current => current + 1);
	}

	/**
	 * exportCSV downloads the current global time report CSV.
	 */
	async function exportCSV(): Promise<void> {
		if (!isSystemAdmin) {
			setManualMessage('');
			setManualError(t('reports.global.time.permission.export'));
			return;
		}

		const normalizedRange = normalizeGlobalDateRange(filter);
		const normalizedFilter: GlobalTimeReportFilter = {
			...filter,
			...normalizedRange,
		};
		const validationMessage = validateGlobalDateRange(normalizedFilter, t);

		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setFilter(normalizedFilter);
		await exportMutation.mutateAsync(normalizedFilter);
	}

	return {
		loadState,
		filter,
		summary,
		message,
		isBusy: reportQuery.isFetching || exportMutation.isPending,
		userIDsForProfiles,
		updateFilter,
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
