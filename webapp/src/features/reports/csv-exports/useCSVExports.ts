import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
	exportWorkspaceLeavesCSV,
	exportWorkspaceMissingStandupsCSV,
	exportWorkspaceStandupSubmissionsCSV,
	exportWorkspaceTimeCSV,
} from '@/api';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from '@/app/events';
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
import type {
	CSVExportFilterDraft,
	CSVExportFilterPatch,
	CSVExportKind,
	CSVExportLoadState,
} from './csv-exports.types';

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
 * useCSVExports owns saved-filter handling and workspace CSV download actions.
 */
export function useCSVExports(input: UseCSVExportsInput): UseCSVExportsResult {
	const [loadState, setLoadState] = useState<CSVExportLoadState>('idle');
	const [activeExportKind, setActiveExportKind] = useState<CSVExportKind | null>(null);
	const [filter, setFilter] = useState<CSVExportFilterDraft>(defaultCSVExportFilter);
	const [message, setMessage] = useState('');

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
				setLoadState('error');
				setMessage(`Saved filter "${event.detail.name}" is not a valid CSV export filter.`);
				return;
			}

			setFilter(current => ({
				...current,
				...savedFilter,
			}));
			setLoadState('done');
			setMessage(`Applied saved filter "${event.detail.name}" to CSV exports.`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [input.workspace.id]);

	/**
	 * updateFilter patches the export filters.
	 */
	function updateFilter(patch: CSVExportFilterPatch): void {
		setFilter(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * exportCSV runs one workspace CSV export and downloads the Blob.
	 */
	async function exportCSV(kind: CSVExportKind): Promise<void> {
		const validationMessage = validateCSVExportFilter(filter);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		const action = csvExportActions.find(candidate => candidate.kind === kind);
		if (action === undefined) {
			setLoadState('error');
			setMessage('Unknown CSV export.');
			return;
		}

		setLoadState('exporting');
		setActiveExportKind(kind);
		setMessage('');

		try {
			const blob = await fetchCSVBlob(input.workspace.id, kind, filter);

			downloadCSVBlob(blob, buildCSVExportFilename(action.filenamePrefix, filter));

			setLoadState('done');
			setActiveExportKind(null);
			setMessage(`${action.title} CSV exported.`);
			toast.success(`${action.title} CSV exported`);
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setActiveExportKind(null);
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		activeExportKind,
		filter,
		message,
		isBusy: loadState === 'exporting',
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
