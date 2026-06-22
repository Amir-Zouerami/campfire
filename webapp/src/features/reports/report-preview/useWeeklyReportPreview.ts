import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/campfire/campfire-toast';
import { isolateBidiText, useI18n } from '@/i18n';

import { getWeeklyReportPreview, postWeeklyReportPreview } from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { campfireQueryKeys } from '@/query';
import { normalizeISODateInputValue } from '@/lib/dates';
import type { ReportSortMode, WeeklyReportPreview, Workspace } from '@/types/domain';

import {
	buildWeeklyReportCalendarLabels,
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
 *
 * Weekly preview state uses the same query architecture as daily previews so
 * report screens can share predictable loading, error, and invalidation behavior.
 */
export function useWeeklyReportPreview(input: UseWeeklyReportPreviewInput): UseWeeklyReportPreviewResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const currentWeek = useMemo(() => getCurrentWeekRange(), []);
	const [periodStart, setPeriodStartState] = useState(currentWeek.startDate);
	const [periodEnd, setPeriodEndState] = useState(currentWeek.endDate);
	const [sortMode, setSortModeState] = useState<ReportSortMode>('first_submitted');
	const [manualMessage, setManualMessage] = useState('');
	const [manualError, setManualError] = useState('');

	const normalizedStartDate = normalizeISODateInputValue(periodStart);
	const normalizedEndDate = normalizeISODateInputValue(periodEnd);
	const validationError = reportDateRangeIsValid(normalizedStartDate, normalizedEndDate)
		? ''
		: t('reports.preview.validation.weeklyRange');

	const previewQuery = useQuery({
		queryKey: campfireQueryKeys.weeklyReportPreview(
			input.workspace.id,
			normalizedStartDate,
			normalizedEndDate,
			sortMode,
			input.workspace.timezone,
			input.refreshToken,
		),
		queryFn: async (): Promise<WeeklyReportPreview> => {
			const calendarLabels = buildWeeklyReportCalendarLabels(
				normalizedStartDate,
				normalizedEndDate,
				input.workspace.timezone,
			);
			const response = await getWeeklyReportPreview(
				input.workspace.id,
				normalizedStartDate,
				normalizedEndDate,
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
			const calendarLabels = buildWeeklyReportCalendarLabels(
				normalizedStartDate,
				normalizedEndDate,
				input.workspace.timezone,
			);
			await postWeeklyReportPreview(input.workspace.id, {
				periodStart: normalizedStartDate,
				periodEnd: normalizedEndDate,
				sortMode,
				calendarLabels,
			});
		},
		onSuccess: async (): Promise<void> => {
			setPeriodStartState(normalizedStartDate);
			setPeriodEndState(normalizedEndDate);
			setManualError('');
			setManualMessage(t('reports.preview.message.weeklyPosted'));
			toast.success(t('reports.preview.toast.weeklyPosted'));

			await queryClient.invalidateQueries({
				queryKey: campfireQueryKeys.reportPreviews(input.workspace.id),
			});
		},
		onError: (error: unknown): void => {
			const errorMessage = errorToMessage(error, t('reports.preview.error.fallback'));

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

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
					setManualMessage('');
					setManualError(t('reports.preview.filter.invalidWeekly', { name: isolateBidiText(event.detail.name) }));
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
					setSortModeState(toWeeklyReportSortMode(record.sortMode));
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

	const queryErrorMessage = previewQuery.isError ? errorToMessage(previewQuery.error, t('reports.preview.error.fallback')) : '';
	const message = manualError || validationError || queryErrorMessage || manualMessage;
	const loadState = resolveReportPreviewLoadState({
		validationError,
		manualError,
		queryErrorMessage,
		queryLoading: previewQuery.isLoading,
		posting: postMutation.isPending,
	});

	/**
	 * setPeriodStart updates the weekly report start date.
	 */
	function setPeriodStart(date: string): void {
		setManualError('');
		setManualMessage('');
		setPeriodStartState(normalizeISODateInputValue(date));
	}

	/**
	 * setPeriodEnd updates the weekly report end date.
	 */
	function setPeriodEnd(date: string): void {
		setManualError('');
		setManualMessage('');
		setPeriodEndState(normalizeISODateInputValue(date));
	}

	/**
	 * setSortMode updates the preview sort mode and lets the query cache refetch.
	 */
	function setSortMode(sortModeValue: ReportSortMode): void {
		setManualError('');
		setManualMessage('');
		setSortModeState(sortModeValue);
	}

	/**
	 * resetToCurrentWeek resets the report range to this local week.
	 */
	function resetToCurrentWeek(): void {
		const nextWeek = getCurrentWeekRange();

		setManualError('');
		setManualMessage('');
		setPeriodStartState(nextWeek.startDate);
		setPeriodEndState(nextWeek.endDate);
	}

	/**
	 * postReport posts the current weekly report preview to the workspace channel.
	 */
	async function postReport(): Promise<void> {
		if (validationError !== '') {
			setManualMessage('');
			setManualError(t('reports.preview.validation.weeklyRangeBeforePosting'));
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
		periodStart,
		periodEnd,
		sortMode,
		preview,
		message,
		isBusy: previewQuery.isFetching || postMutation.isPending,
		dailyPreviewCount: preview?.dailyPreviews.length ?? 0,
		markdownLines,
		setPeriodStart,
		setPeriodEnd,
		setSortMode,
		resetToCurrentWeek,
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
