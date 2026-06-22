import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getTimeReportSummary } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { isolateBidiText, useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { TimeReportSummary, Workspace } from '@/types/domain';

import {
	collectTimeReportUserIDs,
	defaultTimeReportFilter,
	errorToMessage,
	parseTimeReportSavedFilter,
	timeReportEntryCount,
	validateTimeReportFilter,
} from './time-report.helpers';
import type { TimeReportFilterDraft, TimeReportFilterPatch, TimeReportLoadState } from './time-report.types';

/**
 * UseTimeReportInput contains workspace context for workspace time reporting.
 */
type UseTimeReportInput = {
	readonly workspace: Workspace;
};

/**
 * UseTimeReportResult contains workspace time report state and actions.
 */
export type UseTimeReportResult = {
	readonly loadState: TimeReportLoadState;
	readonly filter: TimeReportFilterDraft;
	readonly summary: TimeReportSummary | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly totalMinutes: number;
	readonly rowCount: number;
	readonly entryCount: number;
	readonly userIDsForProfiles: readonly string[];
	readonly updateFilter: (patch: TimeReportFilterPatch) => void;
	readonly loadReport: () => Promise<void>;
};

/**
 * useTimeReport owns filter drafts and query-backed summary loading.
 *
 * The report remains explicit-load because time summaries can be expensive and
 * admins often adjust multiple filters before asking Campfire to run the query.
 */
export function useTimeReport(input: UseTimeReportInput): UseTimeReportResult {
	const { t } = useI18n();
	const [filter, setFilter] = useState<TimeReportFilterDraft>(defaultTimeReportFilter);
	const [queryFilter, setQueryFilter] = useState<TimeReportFilterDraft | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [manualMessage, setManualMessage] = useState('');
	const [manualError, setManualError] = useState('');

	const reportQuery = useQuery({
		queryKey: campfireQueryKeys.timeReportSummary(
			input.workspace.id,
			queryFilter?.startDate ?? '',
			queryFilter?.endDate ?? '',
			queryFilter?.groupBy ?? 'person',
			refreshToken,
		),
		queryFn: async (): Promise<TimeReportSummary> => {
			if (queryFilter === null) {
				throw new Error(t('reports.time.validation.loadReportFirst'));
			}

			const response = await getTimeReportSummary(
				input.workspace.id,
				queryFilter.startDate,
				queryFilter.endDate,
				queryFilter.groupBy,
			);

			return response.summary;
		},
		enabled: queryFilter !== null,
	});

	const summary = reportQuery.data ?? null;
	const userIDsForProfiles = useMemo(() => collectTimeReportUserIDs(summary), [summary]);

	useEffect(() => {
		/**
		 * handleApplyReportFilter applies saved time report filters from the saved-filter page.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== input.workspace.id || event.detail.reportType !== 'time') {
				return;
			}

			const savedFilter = parseTimeReportSavedFilter(event.detail.filterJson);
			if (savedFilter === null) {
				setManualMessage('');
				setManualError(t('reports.time.filter.invalid', { name: isolateBidiText(event.detail.name) }));
				return;
			}

			setFilter(current => ({
				...current,
				...savedFilter,
			}));
			setManualError('');
			setManualMessage(t('reports.time.filter.applied', { name: isolateBidiText(event.detail.name) }));
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id, t]);

	/**
	 * updateFilter patches the current report filter.
	 */
	function updateFilter(patch: TimeReportFilterPatch): void {
		setManualError('');
		setManualMessage('');
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport validates the draft and runs a query-backed summary load.
	 */
	async function loadReport(): Promise<void> {
		const validationMessage = validateTimeReportFilter(filter, t);

		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setQueryFilter(filter);
		setRefreshToken(current => current + 1);
	}

	const queryErrorMessage = reportQuery.isError
		? errorToMessage(reportQuery.error, t('reports.time.error.fallback'))
		: '';
	const message = manualError || queryErrorMessage || manualMessage;
	const loadState = resolveTimeReportLoadState({
		manualError,
		queryErrorMessage,
		queryLoading: reportQuery.isFetching,
		queryLoaded: queryFilter !== null && summary !== null,
	});

	return {
		loadState,
		filter,
		summary,
		message,
		isBusy: reportQuery.isFetching,
		totalMinutes: summary?.totalMinutes ?? 0,
		rowCount: summary?.rows.length ?? 0,
		entryCount: timeReportEntryCount(summary),
		userIDsForProfiles,
		updateFilter,
		loadReport,
	};
}

/**
 * resolveTimeReportLoadState maps local validation and query state into UI state.
 */
function resolveTimeReportLoadState(input: {
	readonly manualError: string;
	readonly queryErrorMessage: string;
	readonly queryLoading: boolean;
	readonly queryLoaded: boolean;
}): TimeReportLoadState {
	if (input.manualError !== '' || input.queryErrorMessage !== '') {
		return 'error';
	}

	if (input.queryLoading) {
		return 'loading';
	}

	if (input.queryLoaded) {
		return 'ready';
	}

	return 'idle';
}
