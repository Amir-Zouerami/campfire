import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createSavedReportFilter, deleteSavedReportFilter, listSavedReportFilters } from '@/api';
import { dispatchApplyReportFilter } from '@/app/events';
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
 * useSavedFilters owns saved-filter listing, creation, deletion, and apply events.
 */
export function useSavedFilters(input: UseSavedFiltersInput): UseSavedFiltersResult {
	const [loadState, setLoadState] = useState<SavedFiltersLoadState>('idle');
	const [selectedReportType, setSelectedReportType] = useState<ReportKind>('daily');
	const [filters, setFilters] = useState<readonly SavedReportFilter[]>([]);
	const [draft, setDraft] = useState<SavedFilterDraft>({
		name: '',
		reportType: 'daily',
		filterJson: defaultFilterJsonForReportKind('daily'),
	});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadFilters loads saved filters for the selected report type.
		 */
		async function loadFilters(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listSavedReportFilters(input.workspace.id, selectedReportType);

				if (!isActive) {
					return;
				}

				setFilters(response.filters);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadFilters();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, selectedReportType]);

	const sortedFilters = useMemo(() => sortSavedFilters(filters), [filters]);
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	/**
	 * updateDraft patches the saved-filter form.
	 */
	function updateDraft(patch: SavedFilterDraftPatch): void {
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
			setLoadState('error');
			setMessage('Saved filter name is required.');
			return;
		}

		const normalizedFilterJson = normalizeFilterJson(draft.filterJson);
		if (normalizedFilterJson === null) {
			setLoadState('error');
			setMessage('Filter JSON must be valid JSON.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createSavedReportFilter(input.workspace.id, {
				name: cleanName,
				scope: 'workspace',
				reportType: draft.reportType,
				filterJson: normalizedFilterJson,
			});

			setFilters(current => [response.filter, ...current]);
			setSelectedReportType(response.filter.reportType);
			setDraft(current => ({
				...current,
				name: '',
				filterJson: normalizedFilterJson,
			}));
			setLoadState('ready');
			setMessage('Saved report filter created.');
			toast.success('Saved report filter created');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * deleteFilter deletes one saved report filter.
	 */
	async function deleteFilter(filterID: string): Promise<void> {
		setLoadState('deleting');
		setMessage('');

		try {
			await deleteSavedReportFilter(input.workspace.id, filterID);

			setFilters(current => current.filter(filter => filter.id !== filterID));
			setLoadState('ready');
			setMessage('Saved report filter deleted.');
			toast.success('Saved report filter deleted');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
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

		setMessage(`Applied saved filter "${filter.name}".`);
		setLoadState('ready');
		toast.success(`Applied "${filter.name}"`);
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
