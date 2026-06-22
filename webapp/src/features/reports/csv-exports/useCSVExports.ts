import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/components/campfire/campfire-toast';

import {
	exportWorkspaceLeavesCSV,
	exportWorkspaceMissingStandupsCSV,
	exportWorkspaceStandupSubmissionsCSV,
	exportWorkspaceTimeCSV,
} from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
import { isolateBidiText, useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import {
	buildCSVExportFilename,
	csvExportActions,
	defaultCSVExportFilter,
	downloadCSVBlob,
	errorToMessage,
	parseCSVExportSavedFilter,
	validateCSVExportFilter,
} from './csv-exports.helpers';
import { csvExportActionTitle } from './csv-exports.i18n';
import type { CSVExportFilterDraft, CSVExportFilterPatch, CSVExportKind, CSVExportLoadState } from './csv-exports.types';

/**
 * UseCSVExportsInput contains workspace context for CSV exports.
 */
type UseCSVExportsInput = {
	readonly workspace: Workspace;
};

/**
 * UseCSVExportsResult contains export filters and actions.
 */
export type UseCSVExportsResult = {
	readonly loadState: CSVExportLoadState;
	readonly activeExportKind: CSVExportKind | null;
	readonly filter: CSVExportFilterDraft;
	readonly message: string;
	readonly isBusy: boolean;
	readonly updateFilter: (patch: CSVExportFilterPatch) => void;
	readonly exportCSV: (kind: CSVExportKind) => Promise<void>;
};

/**
 * CSVExportMutationInput contains one export request.
 */
type CSVExportMutationInput = {
	readonly kind: CSVExportKind;
	readonly filter: CSVExportFilterDraft;
};

/**
 * useCSVExports owns saved-filter handling and mutation-backed CSV downloads.
 */
export function useCSVExports(input: UseCSVExportsInput): UseCSVExportsResult {
	const { t } = useI18n();
	const [activeExportKind, setActiveExportKind] = useState<CSVExportKind | null>(null);
	const [filter, setFilter] = useState<CSVExportFilterDraft>(defaultCSVExportFilter);
	const [manualMessage, setManualMessage] = useState('');
	const [manualError, setManualError] = useState('');

	const exportMutation = useMutation({
		mutationFn: async (mutationInput: CSVExportMutationInput): Promise<void> => {
			const action = csvExportActions.find(candidate => candidate.kind === mutationInput.kind);
			if (action === undefined) {
				throw new Error(t('reports.csv.error.unknownExport'));
			}

			const blob = await fetchCSVBlob(input.workspace.id, mutationInput.kind, mutationInput.filter);
			downloadCSVBlob(blob, buildCSVExportFilename(action.filenamePrefix, mutationInput.filter));
		},
		onSuccess: (_data: void, variables: CSVExportMutationInput): void => {
			const title = csvExportActionTitle(variables.kind, t);

			setActiveExportKind(null);
			setManualError('');
			setManualMessage(t('reports.csv.message.exported', { title }));
			toast.success(t('reports.csv.toast.exported', { title }));
		},
		onError: (error: unknown): void => {
			const errorMessage = errorToMessage(error, t('reports.csv.error.fallback'));

			setActiveExportKind(null);
			setManualMessage('');
			setManualError(errorMessage);
			toast.error(errorMessage);
		},
	});

	useEffect(() => {
		/**
		 * handleApplyReportFilter applies saved export filters.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== input.workspace.id) {
				return;
			}

			const savedFilter = parseCSVExportSavedFilter(event.detail.filterJson);
			if (savedFilter === null) {
				setManualMessage('');
				setManualError(t('reports.csv.filter.invalid', { name: isolateBidiText(event.detail.name) }));
				return;
			}

			setFilter(current => ({
				...current,
				...savedFilter,
			}));
			setManualError('');
			setManualMessage(t('reports.csv.filter.applied', { name: isolateBidiText(event.detail.name) }));
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id, t]);

	/**
	 * updateFilter patches the export filters.
	 */
	function updateFilter(patch: CSVExportFilterPatch): void {
		setManualError('');
		setManualMessage('');
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * exportCSV runs one workspace CSV export and downloads the Blob.
	 */
	async function exportCSV(kind: CSVExportKind): Promise<void> {
		const validationMessage = validateCSVExportFilter(filter, t);
		if (validationMessage !== null) {
			setManualMessage('');
			setManualError(validationMessage);
			return;
		}

		setManualError('');
		setManualMessage('');
		setActiveExportKind(kind);

		try {
			await exportMutation.mutateAsync({ kind, filter });
		} catch (_error: unknown) {
			// onError owns user-facing feedback. The catch prevents unhandled
			// rejected promises from button click handlers.
		}
	}

	const message = manualError || manualMessage;
	const loadState = resolveCSVExportLoadState({
		manualError,
		exporting: exportMutation.isPending,
		done: manualMessage !== '',
	});

	return {
		loadState,
		activeExportKind,
		filter,
		message,
		isBusy: exportMutation.isPending,
		updateFilter,
		exportCSV,
	};
}

/**
 * fetchCSVBlob calls the matching CSV export API.
 */
async function fetchCSVBlob(workspaceID: string, kind: CSVExportKind, filter: CSVExportFilterDraft): Promise<Blob> {
	switch (kind) {
		case 'time':
			return exportWorkspaceTimeCSV(workspaceID, filter.startDate, filter.endDate);

		case 'leaves':
			return exportWorkspaceLeavesCSV(workspaceID, filter.startDate, filter.endDate);

		case 'standups':
			return exportWorkspaceStandupSubmissionsCSV(workspaceID, filter.startDate, filter.endDate, filter.sortMode);

		case 'missing':
			return exportWorkspaceMissingStandupsCSV(workspaceID, filter.startDate, filter.endDate, filter.sortMode);
	}
}

/**
 * resolveCSVExportLoadState maps mutation state into compact UI state.
 */
function resolveCSVExportLoadState(input: {
	readonly manualError: string;
	readonly exporting: boolean;
	readonly done: boolean;
}): CSVExportLoadState {
	if (input.manualError !== '') {
		return 'error';
	}

	if (input.exporting) {
		return 'exporting';
	}

	if (input.done) {
		return 'done';
	}

	return 'idle';
}
