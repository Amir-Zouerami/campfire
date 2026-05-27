import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getWeeklyReportPreview, postWeeklyReportPreview } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { normalizeISODateInputValue } from '@/lib/dates';
import type { ReportSortMode, WeeklyReportPreview, Workspace } from '@/types/domain';

import {
	errorToMessage,
	getCurrentWeekRange,
	markdownLineCount,
	reportDateRangeIsValid,
	toWeeklyReportSortMode,
} from './report-preview.helpers';
import type { ReportPreviewLoadState } from './report-preview.types';

/**
 * UseWeeklyReportPreviewInput contains workspace context and refresh behavior.
 */
type UseWeeklyReportPreviewInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * UseWeeklyReportPreviewResult contains weekly report preview state and actions.
 */
export type UseWeeklyReportPreviewResult = {
	readonly loadState: ReportPreviewLoadState;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly sortMode: ReportSortMode;
	readonly preview: WeeklyReportPreview | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly dailyPreviewCount: number;
	readonly markdownLines: number;
	readonly setPeriodStart: (date: string) => void;
	readonly setPeriodEnd: (date: string) => void;
	readonly setSortMode: (sortMode: ReportSortMode) => void;
	readonly resetToCurrentWeek: () => void;
	readonly postReport: () => Promise<void>;
};

/**
 * useWeeklyReportPreview owns weekly report preview loading and posting.
 */
export function useWeeklyReportPreview(input: UseWeeklyReportPreviewInput): UseWeeklyReportPreviewResult {
	const currentWeek = getCurrentWeekRange();

	const [loadState, setLoadState] = useState<ReportPreviewLoadState>('idle');
	const [periodStart, setPeriodStartState] = useState(currentWeek.startDate);
	const [periodEnd, setPeriodEndState] = useState(currentWeek.endDate);
	const [sortMode, setSortMode] = useState<ReportSortMode>('blockers_first');
	const [preview, setPreview] = useState<WeeklyReportPreview | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		/**
		 * handleApplyReportFilter applies a saved weekly report filter.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== input.workspace.id || event.detail.reportType !== 'weekly') {
				return;
			}

			try {
				const parsed: unknown = JSON.parse(event.detail.filterJson);

				if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
					setMessage(`Saved filter "${event.detail.name}" is not a valid weekly report filter.`);
					setLoadState('error');
					return;
				}

				const record = parsed as Record<string, unknown>;

				if (typeof record.periodStart === 'string' && record.periodStart.trim() !== '') {
					setPeriodStartState(normalizeISODateInputValue(record.periodStart));
				}

				if (typeof record.periodEnd === 'string' && record.periodEnd.trim() !== '') {
					setPeriodEndState(normalizeISODateInputValue(record.periodEnd));
				}

				if (typeof record.sortMode === 'string') {
					setSortMode(toWeeklyReportSortMode(record.sortMode));
				}

				setMessage(`Applied saved filter "${event.detail.name}".`);
				setLoadState('ready');
			} catch (_error: unknown) {
				setMessage(`Saved filter "${event.detail.name}" is not valid JSON.`);
				setLoadState('error');
			}
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id]);

	useEffect(() => {
		let isActive = true;

		/**
		 * loadPreview loads the weekly Markdown report preview.
		 */
		async function loadPreview(): Promise<void> {
			const normalizedStartDate = normalizeISODateInputValue(periodStart);
			const normalizedEndDate = normalizeISODateInputValue(periodEnd);

			if (normalizedStartDate !== periodStart || normalizedEndDate !== periodEnd) {
				setPeriodStartState(normalizedStartDate);
				setPeriodEndState(normalizedEndDate);
				return;
			}

			if (!reportDateRangeIsValid(normalizedStartDate, normalizedEndDate)) {
				setPreview(null);
				setMessage('Choose a real weekly report date range in YYYY-MM-DD format.');
				setLoadState('error');
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await getWeeklyReportPreview(
					input.workspace.id,
					normalizedStartDate,
					normalizedEndDate,
					sortMode,
				);

				if (!isActive) {
					return;
				}

				setPreview(response.preview);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setPreview(null);
				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadPreview();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken, periodStart, periodEnd, sortMode]);

	const markdownLines = useMemo(() => {
		return markdownLineCount(preview?.markdown ?? '');
	}, [preview]);

	/**
	 * setPeriodStart updates the weekly report start date.
	 */
	function setPeriodStart(date: string): void {
		setPeriodStartState(normalizeISODateInputValue(date));
	}

	/**
	 * setPeriodEnd updates the weekly report end date.
	 */
	function setPeriodEnd(date: string): void {
		setPeriodEndState(normalizeISODateInputValue(date));
	}

	/**
	 * resetToCurrentWeek resets the report range to this local week.
	 */
	function resetToCurrentWeek(): void {
		const nextWeek = getCurrentWeekRange();

		setPeriodStartState(nextWeek.startDate);
		setPeriodEndState(nextWeek.endDate);
	}

	/**
	 * postReport posts the current weekly report preview to the workspace channel.
	 */
	async function postReport(): Promise<void> {
		const normalizedStartDate = normalizeISODateInputValue(periodStart);
		const normalizedEndDate = normalizeISODateInputValue(periodEnd);

		if (!reportDateRangeIsValid(normalizedStartDate, normalizedEndDate)) {
			setMessage('Choose a real weekly report date range in YYYY-MM-DD format before posting.');
			setLoadState('error');
			return;
		}

		if (preview === null) {
			setMessage('Load a report preview before posting.');
			setLoadState('error');
			return;
		}

		setLoadState('posting');
		setMessage('');

		try {
			await postWeeklyReportPreview(input.workspace.id, {
				periodStart: normalizedStartDate,
				periodEnd: normalizedEndDate,
				sortMode,
			});

			setPeriodStartState(normalizedStartDate);
			setPeriodEndState(normalizedEndDate);
			setLoadState('ready');
			setMessage('Weekly report posted.');
			toast.success('Weekly report posted');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		periodStart,
		periodEnd,
		sortMode,
		preview,
		message,
		isBusy: loadState === 'loading' || loadState === 'posting',
		dailyPreviewCount: preview?.dailyPreviews.length ?? 0,
		markdownLines,
		setPeriodStart,
		setPeriodEnd,
		setSortMode,
		resetToCurrentWeek,
		postReport,
	};
}
