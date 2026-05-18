import { useMemo, useState, type FormEvent, type ReactElement } from 'react';

import type { GlobalTimeReportSummary, TimeReportGroupBy } from '../types/domain';
import { ApiClientError, exportGlobalTimeReportCSV, getGlobalTimeReportSummary } from '../api/client';

/**
 * GlobalReportsCardProps contains global report access state.
 */
type GlobalReportsCardProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * LoadState describes the global reports card state.
 */
type LoadState = 'idle' | 'loading' | 'exporting' | 'ready' | 'error';

const groupOptions: readonly TimeReportGroupBy[] = ['person', 'project', 'category', 'task', 'day', 'week'];

/**
 * GlobalReportsCard renders an MVP global time dashboard.
 */
export function GlobalReportsCard(props: GlobalReportsCardProps): ReactElement {
	const defaultRange = useMemo(() => getDefaultDateRange(), []);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [groupBy, setGroupBy] = useState<TimeReportGroupBy>('person');
	const [summary, setSummary] = useState<GlobalTimeReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const isBusy = loadState === 'loading' || loadState === 'exporting';

	/**
	 * Loads the global time report.
	 */
	async function handleLoadReport(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getGlobalTimeReportSummary(startDate, endDate, groupBy);
			setSummary(response.summary);
			setLoadState('ready');
			setMessage('');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Exports the current global time report controls as CSV.
	 */
	async function handleExportCSV(): Promise<void> {
		setLoadState('exporting');
		setMessage('');

		try {
			const blob = await exportGlobalTimeReportCSV(startDate, endDate, groupBy);
			downloadBlob(blob, buildExportFilename('campfire-global-time', startDate, endDate));
			setLoadState('ready');
			setMessage('Global time CSV downloaded.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	if (!props.isSystemAdmin) {
		return (
			<section className="cf:rounded-3xl cf:border cf:border-violet-300/20 cf:bg-white/[0.055] cf:p-6">
				<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-violet-200">
					Global reports
				</p>
				<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
					Admin-only dashboard
				</h2>
				<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
					Global reports are restricted to system admins in this MVP.
				</p>
			</section>
		);
	}

	return (
		<section className="cf:rounded-3xl cf:border cf:border-violet-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-violet-200">
						Global reports
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Global time dashboard
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Aggregate time across all active Campfire workspaces. This is the MVP global report surface.
					</p>
				</div>

				{summary !== null && (
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<MetricPill label="Workspaces" value={String(summary.workspaceCount)} />
						<MetricPill label="Entries" value={String(summary.entryCount)} />
						<MetricPill label="Total" value={formatMinutes(summary.totalMinutes)} />
					</div>
				)}
			</div>

			<form
				className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_1fr_auto]"
				onSubmit={event => void handleLoadReport(event)}
			>
				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-violet-300/45"
					disabled={isBusy}
					type="date"
					value={startDate}
					onChange={event => setStartDate(event.currentTarget.value)}
				/>

				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-violet-300/45"
					disabled={isBusy}
					type="date"
					value={endDate}
					onChange={event => setEndDate(event.currentTarget.value)}
				/>

				<select
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-violet-300/45"
					disabled={isBusy}
					value={groupBy}
					onChange={event => setGroupBy(event.currentTarget.value as TimeReportGroupBy)}
				>
					{groupOptions.map(option => (
						<option key={option} value={option}>
							{formatLabel(option)}
						</option>
					))}
				</select>

				<div className="cf:flex cf:flex-wrap cf:gap-3">
					<button
						className="cf:rounded-2xl cf:border cf:border-violet-300/30 cf:bg-violet-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-violet-50 cf:transition cf:hover:bg-violet-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="submit"
					>
						Load global report
					</button>

					<button
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-5 cf:py-3 cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1] cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="button"
						onClick={() => void handleExportCSV()}
					>
						Export CSV
					</button>
				</div>
			</form>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{summary !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<GlobalWorkspaceTotals summary={summary} />
					<GlobalTimeRows summary={summary} />
				</div>
			)}
		</section>
	);
}

/**
 * MetricPill renders one compact global metric.
 */
function MetricPill(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="cf:rounded-full cf:border cf:border-violet-300/25 cf:bg-violet-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-violet-100">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * GlobalWorkspaceTotals renders workspace totals.
 */
function GlobalWorkspaceTotals(props: { readonly summary: GlobalTimeReportSummary }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Workspace totals</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.summary.workspaces.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No workspace time found for this range.
					</p>
				)}

				{props.summary.workspaces.map(workspace => (
					<div
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={workspace.workspaceId}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<strong className="cf:text-sm cf:font-black cf:text-white">
								{workspace.workspaceName || workspace.workspaceId}
							</strong>
							<span className="cf:text-sm cf:font-black cf:text-violet-100">
								{formatMinutes(workspace.totalMinutes)}
							</span>
						</div>
						<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
							{workspace.entryCount} entries
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * GlobalTimeRows renders grouped global time rows.
 */
function GlobalTimeRows(props: { readonly summary: GlobalTimeReportSummary }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">
				Grouped by {formatLabel(props.summary.groupBy)}
			</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.summary.rows.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No grouped rows for this range.
					</p>
				)}

				{props.summary.rows.map(row => (
					<div
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={row.key}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<strong className="cf:text-sm cf:font-black cf:text-white">{row.label}</strong>
							<span className="cf:text-sm cf:font-black cf:text-violet-100">
								{formatMinutes(row.minutes)}
							</span>
						</div>
						<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
							{row.entryCount} entries
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * getDefaultDateRange returns a practical default range.
 */
function getDefaultDateRange(): { readonly startDate: string; readonly endDate: string } {
	const end = new Date();
	const start = new Date(end);
	start.setDate(end.getDate() - 13);

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
 * formatMinutes formats minutes as compact hours/minutes text.
 */
function formatMinutes(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (hours === 0) {
		return `${remainingMinutes}m`;
	}

	if (remainingMinutes === 0) {
		return `${hours}h`;
	}

	return `${hours}h ${remainingMinutes}m`;
}

/**
 * formatLabel converts enum-like strings to readable labels.
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

	return 'Could not load global report.';
}

/**
 * downloadBlob downloads a browser Blob with a generated filename.
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}

/**
 * buildExportFilename builds a stable CSV export filename.
 */
function buildExportFilename(prefix: string, startDate: string, endDate: string): string {
	return `${prefix}-${startDate}-to-${endDate}.csv`;
}
