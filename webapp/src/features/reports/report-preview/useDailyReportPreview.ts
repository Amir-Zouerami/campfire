import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { getDailyReportPreview, postDailyReportPreview } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';
import type { DailyReportPreview, StandupSubmissionSortMode, Workspace } from '@/types/domain';

import {
	buildDailyReportCalendarLabels,
	errorToMessage,
	getTodayLocalDateString,
	markdownLineCount,
	toDailyReportSortMode,
} from './report-preview.helpers';
import type { ReportPreviewLoadState } from './report-preview.types';

/**
 * UseDailyReportPreviewInput contains workspace context and refresh behavior.
 */
type UseDailyReportPreviewInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * UseDailyReportPreviewResult contains daily report preview state and actions.
 */
export type UseDailyReportPreviewResult = {
	readonly loadState: ReportPreviewLoadState;
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
	readonly preview: DailyReportPreview | null;
	readonly message: string;
	readonly isBusy: boolean;
	readonly submittedCount: number;
	readonly missingCount: number;
	readonly onLeaveCount: number;
	readonly markdownLines: number;
	readonly setOccurrenceDate: (date: string) => void;
	readonly setSortMode: (sortMode: StandupSubmissionSortMode) => void;
	readonly postReport: () => Promise<void>;
};

/**
 * useDailyReportPreview owns daily report preview loading and posting.
 */
export function useDailyReportPreview(input: UseDailyReportPreviewInput): UseDailyReportPreviewResult {
	const [loadState, setLoadState] = useState<ReportPreviewLoadState>('idle');
	const [occurrenceDate, setOccurrenceDateState] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [preview, setPreview] = useState<DailyReportPreview | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		/**
		 * handleApplyReportFilter applies a saved daily report filter.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== input.workspace.id || event.detail.reportType !== 'daily') {
				return;
			}

			try {
				const parsed: unknown = JSON.parse(event.detail.filterJson);

				if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
					setMessage(`Saved filter "${event.detail.name}" is not a valid daily report filter.`);
					setLoadState('error');
					return;
				}

				const record = parsed as Record<string, unknown>;

				if (typeof record.occurrenceDate === 'string' && record.occurrenceDate.trim() !== '') {
					setOccurrenceDateState(normalizeISODateInputValue(record.occurrenceDate));
				}

				if (typeof record.sortMode === 'string') {
					setSortMode(toDailyReportSortMode(record.sortMode));
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
		 * loadPreview loads the daily Markdown report preview.
		 */
		async function loadPreview(): Promise<void> {
			const normalizedOccurrenceDate = normalizeISODateInputValue(occurrenceDate);

			if (!isISODateInputValue(normalizedOccurrenceDate)) {
				setPreview(null);
				setMessage('Choose a real report date in YYYY-MM-DD format.');
				setLoadState('error');
				return;
			}

			if (normalizedOccurrenceDate !== occurrenceDate) {
				setOccurrenceDateState(normalizedOccurrenceDate);
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const calendarLabels = buildDailyReportCalendarLabels(normalizedOccurrenceDate, input.workspace.timezone);
				const response = await getDailyReportPreview(
					input.workspace.id,
					normalizedOccurrenceDate,
					sortMode,
					calendarLabels,
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
	}, [input.workspace.id, input.refreshToken, occurrenceDate, sortMode]);

	const markdownLines = useMemo(() => {
		return markdownLineCount(preview?.markdown ?? '');
	}, [preview]);

	/**
	 * setOccurrenceDate updates the report date after normalizing common input formats.
	 */
	function setOccurrenceDate(date: string): void {
		setOccurrenceDateState(normalizeISODateInputValue(date));
	}

	/**
	 * postReport posts the current daily report preview to the workspace channel.
	 */
	async function postReport(): Promise<void> {
		const normalizedOccurrenceDate = normalizeISODateInputValue(occurrenceDate);

		if (!isISODateInputValue(normalizedOccurrenceDate)) {
			setMessage('Choose a real report date in YYYY-MM-DD format before posting.');
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
			const calendarLabels = buildDailyReportCalendarLabels(normalizedOccurrenceDate, input.workspace.timezone);
			await postDailyReportPreview(input.workspace.id, {
				occurrenceDate: normalizedOccurrenceDate,
				sortMode,
				calendarLabels,
			});

			setOccurrenceDateState(normalizedOccurrenceDate);
			setLoadState('ready');
			setMessage('Daily report posted.');
			toast.success('Daily report posted');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		occurrenceDate,
		sortMode,
		preview,
		message,
		isBusy: loadState === 'loading' || loadState === 'posting',
		submittedCount: preview?.submittedUserIds.length ?? 0,
		missingCount: preview?.missingUserIds.length ?? 0,
		onLeaveCount: preview?.onLeaveUserIds.length ?? 0,
		markdownLines,
		setOccurrenceDate,
		setSortMode,
		postReport,
	};
}
