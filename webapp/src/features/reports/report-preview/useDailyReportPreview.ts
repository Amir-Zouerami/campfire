import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/campfire/campfire-toast';
import { isolateBidiText, useI18n } from '@/i18n';

import { getDailyReportPreview, postDailyReportPreview } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { campfireQueryKeys } from '@/query';
import { isISODateInputValue, normalizeISODateInputValue } from '@/lib/dates';
import type { DailyReportPreview, StandupSubmissionSortMode, Workspace } from '@/types/domain';

import {
	buildDailyReportCalendarLabels,
	reportPreviewErrorToMessage,
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
 *
 * Data loading is intentionally routed through TanStack Query so previews,
 * refetches, loading states, and future cross-page invalidation use one cache
 * contract instead of ad-hoc effect-local request state.
 */
export function useDailyReportPreview(input: UseDailyReportPreviewInput): UseDailyReportPreviewResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [occurrenceDate, setOccurrenceDateState] = useState(getTodayLocalDateString());
	const [sortMode, setSortModeState] = useState<StandupSubmissionSortMode>('first_submitted');
	const [manualMessage, setManualMessage] = useState('');
	const [manualError, setManualError] = useState('');

	const normalizedOccurrenceDate = normalizeISODateInputValue(occurrenceDate);
	const validationError = isISODateInputValue(normalizedOccurrenceDate)
		? ''
		: t('reports.preview.validation.dailyDate');

	const previewQuery = useQuery({
		queryKey: campfireQueryKeys.dailyReportPreview(
			input.workspace.id,
			normalizedOccurrenceDate,
			sortMode,
			input.workspace.timezone,
			input.refreshToken,
		),
		queryFn: async (): Promise<DailyReportPreview> => {
			const calendarLabels = buildDailyReportCalendarLabels(normalizedOccurrenceDate, input.workspace.timezone);
			const response = await getDailyReportPreview(
				input.workspace.id,
				normalizedOccurrenceDate,
				sortMode,
				calendarLabels,
			);

			return response.preview;
		},
		enabled: validationError === '',
	});

	const preview = previewQuery.data ?? null;

	const postMutation = useMutation({
		mutationFn: async (): Promise<void> => {
			const calendarLabels = buildDailyReportCalendarLabels(normalizedOccurrenceDate, input.workspace.timezone);
			await postDailyReportPreview(input.workspace.id, {
				occurrenceDate: normalizedOccurrenceDate,
				sortMode,
				calendarLabels,
			});
		},
		onSuccess: async (): Promise<void> => {
			setOccurrenceDateState(normalizedOccurrenceDate);
			setManualError('');
			setManualMessage(t('reports.preview.message.dailyPosted'));
			toast.success(t('reports.preview.toast.dailyPosted'));

			await queryClient.invalidateQueries({
				queryKey: campfireQueryKeys.reportPreviews(input.workspace.id),
			});
		},
		onError: (error: unknown): void => {
			const errorMessage = reportPreviewErrorToMessage(error, t);

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

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
					setManualMessage('');
					setManualError(t('reports.preview.filter.invalidDaily', { name: isolateBidiText(event.detail.name) }));
					return;
				}

				const record = parsed as Record<string, unknown>;

				if (typeof record.occurrenceDate === 'string' && record.occurrenceDate.trim() !== '') {
					setOccurrenceDateState(normalizeISODateInputValue(record.occurrenceDate));
				}

				if (typeof record.sortMode === 'string') {
					setSortModeState(toDailyReportSortMode(record.sortMode));
				}

				setManualError('');
				setManualMessage(t('reports.preview.filter.applied', { name: isolateBidiText(event.detail.name) }));
			} catch (_error: unknown) {
				setManualMessage('');
				setManualError(t('reports.preview.filter.invalidJson', { name: isolateBidiText(event.detail.name) }));
			}
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id, t]);

	const markdownLines = useMemo(() => {
		return markdownLineCount(preview?.markdown ?? '');
	}, [preview]);

	const queryErrorMessage = previewQuery.isError ? reportPreviewErrorToMessage(previewQuery.error, t) : '';
	const message = manualError || validationError || queryErrorMessage || manualMessage;
	const loadState = resolveReportPreviewLoadState({
		validationError,
		manualError,
		queryErrorMessage,
		queryLoading: previewQuery.isLoading,
		posting: postMutation.isPending,
	});

	/**
	 * setOccurrenceDate updates the report date after normalizing common input formats.
	 */
	function setOccurrenceDate(date: string): void {
		setManualError('');
		setManualMessage('');
		setOccurrenceDateState(normalizeISODateInputValue(date));
	}

	/**
	 * setSortMode updates the preview sort mode and lets the query cache refetch.
	 */
	function setSortMode(sortModeValue: StandupSubmissionSortMode): void {
		setManualError('');
		setManualMessage('');
		setSortModeState(sortModeValue);
	}

	/**
	 * postReport posts the current daily report preview to the workspace channel.
	 */
	async function postReport(): Promise<void> {
		if (validationError !== '') {
			setManualMessage('');
			setManualError(t('reports.preview.validation.dailyDateBeforePosting'));
			return;
		}

		if (preview === null) {
			setManualMessage('');
			setManualError(t('reports.preview.validation.loadBeforePosting'));
			return;
		}

		setManualMessage('');
		setManualError('');

		try {
			await postMutation.mutateAsync();
		} catch (_error: unknown) {
			// onError owns user-facing feedback. The catch only prevents the
			// click handler from producing an unhandled rejected promise.
		}
	}

	return {
		loadState,
		occurrenceDate,
		sortMode,
		preview,
		message,
		isBusy: previewQuery.isFetching || postMutation.isPending,
		submittedCount: preview?.submittedUserIds.length ?? 0,
		missingCount: preview?.missingUserIds.length ?? 0,
		onLeaveCount: preview?.onLeaveUserIds.length ?? 0,
		markdownLines,
		setOccurrenceDate,
		setSortMode,
		postReport,
	};
}

/**
 * resolveReportPreviewLoadState maps query and mutation state into UI state.
 */
function resolveReportPreviewLoadState(input: {
	readonly validationError: string;
	readonly manualError: string;
	readonly queryErrorMessage: string;
	readonly queryLoading: boolean;
	readonly posting: boolean;
}): ReportPreviewLoadState {
	if (input.posting) {
		return 'posting';
	}

	if (input.validationError !== '' || input.manualError !== '' || input.queryErrorMessage !== '') {
		return 'error';
	}

	if (input.queryLoading) {
		return 'loading';
	}

	return 'ready';
}
