import { useState, type ReactElement } from 'react';

import { ApiClientError, exportWorkspaceLeavesCSV, exportWorkspaceTimeCSV } from '../api/client';
import type { Workspace } from '../types/domain';

/**
 * CSVExportsCardProps contains the current workspace.
 */
type CSVExportsCardProps = {
	readonly workspace: Workspace;
};

/**
 * ExportState describes the current export action state.
 */
type ExportState = 'idle' | 'exporting_time' | 'exporting_leaves' | 'error' | 'done';

/**
 * CSVExportsCard lets authorized users download workspace report CSV files.
 */
export function CSVExportsCard(props: CSVExportsCardProps): ReactElement {
	const defaultRange = getDefaultDateRange();
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [exportState, setExportState] = useState<ExportState>('idle');
	const [message, setMessage] = useState('');

	const isBusy = exportState === 'exporting_time' || exportState === 'exporting_leaves';

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
						Download CSV files for workspace time entries and approved leaves in a selected date range.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-cyan-300/25 cf:bg-cyan-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-cyan-200">
					{startDate} → {endDate}
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[180px_180px_auto_auto] cf:lg:items-end">
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
