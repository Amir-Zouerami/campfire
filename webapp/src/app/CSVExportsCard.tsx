import { useEffect, useState, type ReactElement } from 'react';

import {
	ApiClientError,
	exportWorkspaceLeavesCSV,
	exportWorkspaceMissingStandupsCSV,
	exportWorkspaceStandupSubmissionsCSV,
	exportWorkspaceTimeCSV,
} from '../api/client';
import type { StandupSubmissionSortMode, Workspace } from '../types/domain';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from './events';

/**
 * CSVExportsCardProps contains the current workspace.
 */
type CSVExportsCardProps = {
	readonly workspace: Workspace;
};

/**
 * ExportState describes the current export action state.
 */
type ExportState =
	| 'idle'
	| 'exporting_time'
	| 'exporting_leaves'
	| 'exporting_standups'
	| 'exporting_missing'
	| 'error'
	| 'done';

const sortModeOptions: readonly StandupSubmissionSortMode[] = [
	'first_submitted',
	'last_submitted',
	'name',
	'missing_first',
];

/**
 * CSVExportsCard lets authorized users download workspace report CSV files.
 */
export function CSVExportsCard(props: CSVExportsCardProps): ReactElement {
	const defaultRange = getDefaultDateRange();
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [exportState, setExportState] = useState<ExportState>('idle');
	const [message, setMessage] = useState('');

	const isBusy =
		exportState === 'exporting_time' ||
		exportState === 'exporting_leaves' ||
		exportState === 'exporting_standups' ||
		exportState === 'exporting_missing';

	useEffect(() => {
		/**
		 * Applies saved export filters dispatched by the saved-filter card.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== props.workspace.id) {
				return;
			}

			const filter = parseCSVExportFilter(event.detail.filterJson);
			if (filter === null) {
				setMessage(`Saved filter "${event.detail.name}" is not a valid export filter.`);
				return;
			}

			if (filter.startDate !== undefined) {
				setStartDate(filter.startDate);
			}

			if (filter.endDate !== undefined) {
				setEndDate(filter.endDate);
			}

			if (filter.sortMode !== undefined) {
				setSortMode(filter.sortMode);
			}

			setMessage(`Applied saved filter "${event.detail.name}" to CSV export controls.`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [props.workspace.id]);

	/**
	 * Downloads the time CSV export.
	 */
	async function handleExportTime(): Promise<void> {
		setExportState('exporting_time');
		setMessage('');

		try {
			const blob = await exportWorkspaceTimeCSV(props.workspace.id, startDate, endDate);
			downloadBlob(blob, buildExportFilename('campfire-time', startDate, endDate));
			setExportState('done');
			setMessage('Time CSV exported.');
		} catch (error: unknown) {
			setExportState('error');
			setMessage(errorToMessage(error));
		}
	}

	/**
	 * Downloads the approved-leave CSV export.
	 */
	async function handleExportLeaves(): Promise<void> {
		setExportState('exporting_leaves');
		setMessage('');

		try {
			const blob = await exportWorkspaceLeavesCSV(props.workspace.id, startDate, endDate);
			downloadBlob(blob, buildExportFilename('campfire-leaves', startDate, endDate));
			setExportState('done');
			setMessage('Leave CSV exported.');
		} catch (error: unknown) {
			setExportState('error');
			setMessage(errorToMessage(error));
		}
	}

	/**
	 * Downloads the standup submissions CSV export.
	 */
	async function handleExportStandups(): Promise<void> {
		setExportState('exporting_standups');
		setMessage('');

		try {
			const blob = await exportWorkspaceStandupSubmissionsCSV(props.workspace.id, startDate, endDate, sortMode);
			downloadBlob(blob, buildExportFilename('campfire-standup-submissions', startDate, endDate));
			setExportState('done');
			setMessage('Standup submissions CSV exported.');
		} catch (error: unknown) {
			setExportState('error');
			setMessage(errorToMessage(error));
		}
	}

	/**
	 * Downloads the missing standups CSV export.
	 */
	async function handleExportMissing(): Promise<void> {
		setExportState('exporting_missing');
		setMessage('');

		try {
			const blob = await exportWorkspaceMissingStandupsCSV(props.workspace.id, startDate, endDate, sortMode);
			downloadBlob(blob, buildExportFilename('campfire-missing-standups', startDate, endDate));
			setExportState('done');
			setMessage('Missing standups CSV exported.');
		} catch (error: unknown) {
			setExportState('error');
			setMessage(errorToMessage(error));
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-cyan-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-cyan-200">
						CSV exports
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Export workspace reports
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Download CSV files for workspace time entries, approved leaves, standup submissions, and missing
						standup users.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-cyan-300/25 cf:bg-cyan-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-cyan-200">
					{startDate} → {endDate}
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[180px_180px_220px] cf:lg:items-end">
				<Field label="Start date">
					<input
						className={inputClassName}
						disabled={isBusy}
						type="date"
						value={startDate}
						onChange={event => setStartDate(event.currentTarget.value)}
					/>
				</Field>

				<Field label="End date">
					<input
						className={inputClassName}
						disabled={isBusy}
						type="date"
						value={endDate}
						onChange={event => setEndDate(event.currentTarget.value)}
					/>
				</Field>

				<Field label="Standup sort">
					<select
						className={inputClassName}
						disabled={isBusy}
						value={sortMode}
						onChange={event => setSortMode(toSortMode(event.currentTarget.value))}
					>
						{sortModeOptions.map(option => (
							<option key={option} value={option}>
								{formatLabel(option)}
							</option>
						))}
					</select>
				</Field>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-3 cf:md:grid-cols-2 cf:xl:grid-cols-4">
				<button
					className="cf:rounded-2xl cf:border cf:border-cyan-300/30 cf:bg-cyan-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-cyan-50 cf:transition cf:hover:bg-cyan-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleExportTime()}
				>
					{exportState === 'exporting_time' ? 'Exporting time…' : 'Export time CSV'}
				</button>

				<button
					className="cf:rounded-2xl cf:border cf:border-emerald-300/30 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleExportLeaves()}
				>
					{exportState === 'exporting_leaves' ? 'Exporting leaves…' : 'Export leaves CSV'}
				</button>

				<button
					className="cf:rounded-2xl cf:border cf:border-sky-300/30 cf:bg-sky-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-sky-50 cf:transition cf:hover:bg-sky-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleExportStandups()}
				>
					{exportState === 'exporting_standups' ? 'Exporting standups…' : 'Export standups CSV'}
				</button>

				<button
					className="cf:rounded-2xl cf:border cf:border-amber-300/30 cf:bg-amber-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-amber-50 cf:transition cf:hover:bg-amber-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleExportMissing()}
				>
					{exportState === 'exporting_missing' ? 'Exporting missing…' : 'Export missing CSV'}
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-cyan-300/60 cf:focus:ring-4 cf:focus:ring-cyan-300/15';

/**
 * Field renders a labeled control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-cyan-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * CSVExportFilter contains saved export controls this card can apply.
 */
type CSVExportFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly sortMode?: StandupSubmissionSortMode;
};

/**
 * parseCSVExportFilter validates saved JSON for CSV export controls.
 */
function parseCSVExportFilter(filterJson: string): CSVExportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);
		if (!isRecord(parsed)) {
			return null;
		}

		const startDate = stringField(parsed, 'startDate') ?? stringField(parsed, 'periodStart');
		const endDate = stringField(parsed, 'endDate') ?? stringField(parsed, 'periodEnd');
		const sortMode = stringField(parsed, 'sortMode');

		return {
			...(startDate === undefined ? {} : { startDate }),
			...(endDate === undefined ? {} : { endDate }),
			...(sortMode === undefined ? {} : { sortMode: toSortMode(sortMode) }),
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * stringField reads one optional string field from a parsed JSON object.
 */
function stringField(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];

	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	return value.trim();
}

/**
 * isRecord narrows JSON values to indexable plain objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * getDefaultDateRange returns a practical default export range.
 */
function getDefaultDateRange(): { readonly startDate: string; readonly endDate: string } {
	const end = new Date();
	const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30);

	return {
		startDate: dateToLocalDateString(start),
		endDate: dateToLocalDateString(end),
	};
}

/**
 * dateToLocalDateString formats a Date as local YYYY-MM-DD.
 */
function dateToLocalDateString(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * buildExportFilename returns a deterministic CSV filename.
 */
function buildExportFilename(prefix: string, startDate: string, endDate: string): string {
	return `${prefix}-${startDate}-to-${endDate}.csv`;
}

/**
 * downloadBlob downloads a Blob using a temporary object URL.
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}

/**
 * toSortMode narrows a string to a supported standup submission sort mode.
 */
function toSortMode(value: string): StandupSubmissionSortMode {
	switch (value) {
		case 'first_submitted':
		case 'last_submitted':
		case 'name':
		case 'missing_first':
			return value;

		default:
			return 'first_submitted';
	}
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not export CSV.';
}
