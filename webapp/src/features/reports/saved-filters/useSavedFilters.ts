import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/campfire/campfire-toast';

import { createSavedReportFilter, deleteSavedReportFilter, listSavedReportFilters } from '@/api';
import { dispatchApplyReportFilter } from '@/app/events';
import { isolateBidiText, useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { ReportKind, SavedReportFilter, Workspace } from '@/types/domain';

import {
	defaultFilterJsonForReportKind,
	errorToMessage,
	normalizeFilterJson,
	sortSavedFilters,
} from './saved-filters.helpers';
import type { SavedFilterDraft, SavedFilterDraftPatch, SavedFiltersLoadState } from './saved-filters.types';

/**
 * UseSavedFiltersInput contains workspace context.
 */
type UseSavedFiltersInput = {
	readonly workspace: Workspace;
};

/**
 * UseSavedFiltersResult contains saved-filter page state and actions.
 */
export type UseSavedFiltersResult = {
	readonly loadState: SavedFiltersLoadState;
	readonly selectedReportType: ReportKind;
	readonly filters: readonly SavedReportFilter[];
	readonly sortedFilters: readonly SavedReportFilter[];
	readonly draft: SavedFilterDraft;
	readonly message: string;
	readonly isBusy: boolean;
	readonly setSelectedReportType: (reportType: ReportKind) => void;
	readonly updateDraft: (patch: SavedFilterDraftPatch) => void;
	readonly createFilter: () => Promise<void>;
	readonly deleteFilter: (filterID: string) => Promise<void>;
	readonly applyFilter: (filter: SavedReportFilter) => void;
};

/**
 * useSavedFilters owns saved-filter drafts and query-backed filter state.
 *
 * Saved filters are report-server state, so TanStack Query owns the list while
 * this hook keeps only form drafts and user-facing validation feedback local.
 */
export function useSavedFilters(input: UseSavedFiltersInput): UseSavedFiltersResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [selectedReportType, setSelectedReportType] = useState<ReportKind>('daily');
	const [draft, setDraft] = useState<SavedFilterDraft>({
		name: '',
		reportType: 'daily',
		filterJson: defaultFilterJsonForReportKind('daily'),
	});
	const [manualMessage, setManualMessage] = useState('');
	const [manualError, setManualError] = useState('');

	const filtersQuery = useQuery({
		queryKey: campfireQueryKeys.savedReportFilters(input.workspace.id, selectedReportType),
		queryFn: async (): Promise<readonly SavedReportFilter[]> => {
			const response = await listSavedReportFilters(input.workspace.id, selectedReportType);

			return response.filters;
		},
	});

	const createMutation = useMutation({
		mutationFn: async (cleanDraft: SavedFilterDraft): Promise<SavedReportFilter> => {
			const response = await createSavedReportFilter(input.workspace.id, {
				name: cleanDraft.name,
				scope: 'workspace',
				reportType: cleanDraft.reportType,
				filterJson: cleanDraft.filterJson,
			});

			return response.filter;
		},
		onSuccess: (filter: SavedReportFilter): void => {
			queryClient.setQueryData<readonly SavedReportFilter[]>(
				campfireQueryKeys.savedReportFilters(input.workspace.id, filter.reportType),
				current => [filter, ...(current ?? [])],
			);
			setSelectedReportType(filter.reportType);
			setDraft(current => ({
				...current,
				name: '',
				filterJson: filter.filterJson,
			}));
			setManualError('');
			setManualMessage(t('reports.saved.message.created'));
			toast.success(t('reports.saved.toast.created'));
		},
		onError: (error: unknown): void => {
			const errorMessage = errorToMessage(error, t);

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (filterID: string): Promise<string> => {
			await deleteSavedReportFilter(input.workspace.id, filterID);

			return filterID;
		},
		onSuccess: (filterID: string): void => {
			queryClient.setQueryData<readonly SavedReportFilter[]>(
				campfireQueryKeys.savedReportFilters(input.workspace.id, selectedReportType),
				current => (current ?? []).filter(filter => filter.id !== filterID),
			);
			setManualError('');
			setManualMessage(t('reports.saved.message.deleted'));
			toast.success(t('reports.saved.toast.deleted'));
		},
		onError: (error: unknown): void => {
			const errorMessage = errorToMessage(error, t);

			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

	const filters = filtersQuery.data ?? [];
	const sortedFilters = useMemo(() => sortSavedFilters(filters), [filters]);
	const queryError = filtersQuery.isError ? errorToMessage(filtersQuery.error, t) : '';
	const message = manualError || queryError || manualMessage;
	const loadState = resolveSavedFiltersLoadState({
		manualError,
		queryError,
		loading: filtersQuery.isFetching,
		saving: createMutation.isPending,
		deleting: deleteMutation.isPending,
		ready: filtersQuery.data !== undefined,
	});
	const isBusy = filtersQuery.isFetching || createMutation.isPending || deleteMutation.isPending;

	/**
	 * updateDraft patches the saved-filter form.
	 */
	function updateDraft(patch: SavedFilterDraftPatch): void {
		setManualError('');
		setManualMessage('');
		setDraft(current => ({
			...current,
			...patch,
			...(patch.reportType === undefined ? {} : { filterJson: defaultFilterJsonForReportKind(patch.reportType) }),
		}));
	}

	/**
	 * createFilter creates a workspace-scoped saved report filter.
	 */
	async function createFilter(): Promise<void> {
		const cleanName = draft.name.trim();

		if (cleanName === '') {
			setManualMessage('');
			setManualError(t('reports.saved.validation.nameRequired'));
			return;
		}

		const normalizedFilterJson = normalizeFilterJson(draft.filterJson);
		if (normalizedFilterJson === null) {
			setManualMessage('');
			setManualError(t('reports.saved.validation.jsonInvalid'));
			return;
		}

		setManualError('');
		setManualMessage('');

		try {
			await createMutation.mutateAsync({
				name: cleanName,
				reportType: draft.reportType,
				filterJson: normalizedFilterJson,
			});
		} catch (_error: unknown) {
			// onError owns visible feedback and toast delivery.
		}
	}

	/**
	 * deleteFilter deletes one saved report filter.
	 */
	async function deleteFilter(filterID: string): Promise<void> {
		setManualError('');
		setManualMessage('');

		try {
			await deleteMutation.mutateAsync(filterID);
		} catch (_error: unknown) {
			// onError owns visible feedback and toast delivery.
		}
	}

	/**
	 * applyFilter broadcasts one saved filter to report pages.
	 */
	function applyFilter(filter: SavedReportFilter): void {
		dispatchApplyReportFilter({
			workspaceID: input.workspace.id,
			reportType: filter.reportType,
			name: filter.name,
			filterJson: filter.filterJson,
		});

		const safeName = isolateBidiText(filter.name);
		setManualError('');
		setManualMessage(t('reports.saved.message.applied', { name: safeName }));
		toast.success(t('reports.saved.toast.applied', { name: safeName }));
	}

	return {
		loadState,
		selectedReportType,
		filters,
		sortedFilters,
		draft,
		message,
		isBusy,
		setSelectedReportType,
		updateDraft,
		createFilter,
		deleteFilter,
		applyFilter,
	};
}

/**
 * resolveSavedFiltersLoadState maps query/mutation state into compact UI state.
 */
function resolveSavedFiltersLoadState(input: {
	readonly manualError: string;
	readonly queryError: string;
	readonly loading: boolean;
	readonly saving: boolean;
	readonly deleting: boolean;
	readonly ready: boolean;
}): SavedFiltersLoadState {
	if (input.manualError !== '' || input.queryError !== '') {
		return 'error';
	}

	if (input.saving) {
		return 'saving';
	}

	if (input.deleting) {
		return 'deleting';
	}

	if (input.loading) {
		return 'loading';
	}

	if (input.ready) {
		return 'ready';
	}

	return 'idle';
}
