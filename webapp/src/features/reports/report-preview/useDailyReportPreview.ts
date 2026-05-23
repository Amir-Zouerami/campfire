import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getDailyReportPreview, postDailyReportPreview } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';
import type { DailyReportPreview, StandupSubmissionSortMode, Workspace } from '@/types/domain';

import {
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
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
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
					setOccurrenceDate(normalizeISODateInputValue(record.occurrenceDate));
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
			if (occurrenceDate.trim() === '') {
				setPreview(null);
				setMessage('Choose a report date.');
				setLoadState('error');
				return;
			}

			const cleanOccurrenceDate = normalizeISODateInputValue(occurrenceDate);

			if (!isISODateInputValue(cleanOccurrenceDate)) {
				setPreview(null);
				setMessage('Choose a real report date using YYYY-MM-DD.');
				setLoadState('error');
				return;
			}

			if (cleanOccurrenceDate !== occurrenceDate) {
				setOccurrenceDate(cleanOccurrenceDate);
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await getDailyReportPreview(input.workspace.id, cleanOccurrenceDate, sortMode);

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
	 * postReport posts the current daily report preview to the workspace channel.
	 */
	async function postReport(): Promise<void> {
		if (preview === null) {
			setMessage('Load a report preview before posting.');
			setLoadState('error');
			return;
		}

		const cleanOccurrenceDate = normalizeISODateInputValue(occurrenceDate);

		if (!isISODateInputValue(cleanOccurrenceDate)) {
			setMessage('Choose a real report date using YYYY-MM-DD.');
			setLoadState('error');
			return;
		}

		if (cleanOccurrenceDate !== occurrenceDate) {
			setOccurrenceDate(cleanOccurrenceDate);
		}

		setLoadState('posting');
		setMessage('');

		try {
			await postDailyReportPreview(input.workspace.id, {
				occurrenceDate: cleanOccurrenceDate,
				sortMode,
			});

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
