import { useEffect, useMemo, useState } from 'react';

import { getTimeReportSummary } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
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
 * useTimeReport owns filter state, saved-filter handling, and summary loading.
 */
export function useTimeReport(input: UseTimeReportInput): UseTimeReportResult {
	const [filter, setFilter] = useState<TimeReportFilterDraft>(defaultTimeReportFilter);
	const [loadState, setLoadState] = useState<TimeReportLoadState>('idle');
	const [summary, setSummary] = useState<TimeReportSummary | null>(null);
	const [message, setMessage] = useState('');

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
				setLoadState('error');
				setMessage(`Saved filter "${event.detail.name}" is not a valid time report filter.`);
				return;
			}

			setFilter(current => ({
				...current,
				...savedFilter,
			}));
			setLoadState('ready');
			setMessage(`Applied saved filter "${event.detail.name}". Load the report to refresh results.`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id]);

	const userIDsForProfiles = useMemo(() => collectTimeReportUserIDs(summary), [summary]);

	/**
	 * updateFilter patches the current report filter.
	 */
	function updateFilter(patch: TimeReportFilterPatch): void {
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * loadReport loads the current workspace time report summary.
	 */
	async function loadReport(): Promise<void> {
		const validationMessage = validateTimeReportFilter(filter);

		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getTimeReportSummary(
				input.workspace.id,
				filter.startDate,
				filter.endDate,
				filter.groupBy,
			);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Time report loaded.');
		} catch (error: unknown) {
			setSummary(null);
			setLoadState('error');
			setMessage(errorToMessage(error));
		}
	}

	return {
		loadState,
		filter,
		summary,
		message,
		isBusy: loadState === 'loading',
		totalMinutes: summary?.totalMinutes ?? 0,
		rowCount: summary?.rows.length ?? 0,
		entryCount: timeReportEntryCount(summary),
		userIDsForProfiles,
		updateFilter,
		loadReport,
	};
}
