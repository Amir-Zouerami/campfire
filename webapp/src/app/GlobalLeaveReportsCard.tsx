import { useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { useUserProfiles } from './useUserProfiles';
import type { GlobalLeaveReportSummary } from '../types/domain';
import { ApiClientError, exportGlobalLeaveReportCSV, getGlobalLeaveReportSummary } from '../api/client';

/**
 * GlobalLeaveReportsCardProps contains global leave report access state.
 */
type GlobalLeaveReportsCardProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * LoadState describes the global leave report card state.
 */
type LoadState = 'idle' | 'loading' | 'exporting' | 'ready' | 'error';

/**
 * GlobalLeaveReportsCard renders an MVP global leave dashboard.
 */
export function GlobalLeaveReportsCard(props: GlobalLeaveReportsCardProps): ReactElement {
	const defaultRange = useMemo(() => getDefaultDateRange(), []);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [summary, setSummary] = useState<GlobalLeaveReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const userIDsForProfiles = useMemo(() => collectGlobalLeaveUserIDs(summary), [summary]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	const isBusy = loadState === 'loading' || loadState === 'exporting';

	/**
	 * Loads the global leave report.
	 */
	async function handleLoadReport(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getGlobalLeaveReportSummary(startDate, endDate);
			setSummary(response.summary);
			setLoadState('ready');
			setMessage('');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Exports the current global leave report controls as CSV.
	 */
	async function handleExportCSV(): Promise<void> {
		setLoadState('exporting');
		setMessage('');

		try {
			const blob = await exportGlobalLeaveReportCSV(startDate, endDate);
			downloadBlob(blob, buildExportFilename('campfire-global-leaves', startDate, endDate));
			setLoadState('ready');
			setMessage('Global leave CSV downloaded.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	if (!props.isSystemAdmin) {
		return (
			<section className="cf:rounded-3xl cf:border cf:border-emerald-300/20 cf:bg-white/[0.055] cf:p-6">
				<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-emerald-200">
					Global leaves
				</p>
				<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
					Admin-only leave dashboard
				</h2>
				<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
					Global leave reports are restricted to system admins in this MVP.
				</p>
			</section>
		);
	}

	return (
		<section className="cf:rounded-3xl cf:border cf:border-emerald-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-emerald-200">
						Global leaves
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Global leave dashboard
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						See approved and pending leave across all active Campfire workspaces.
					</p>
				</div>

				{summary !== null && (
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<MetricPill label="Workspaces" value={String(summary.workspaceCount)} />
						<MetricPill label="Approved" value={String(summary.approvedCount)} />
						<MetricPill label="Pending" value={String(summary.pendingCount)} />
					</div>
				)}
			</div>

			<form
				className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_auto]"
				onSubmit={event => void handleLoadReport(event)}
			>
				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
					disabled={isBusy}
					type="date"
					value={startDate}
					onChange={event => setStartDate(event.currentTarget.value)}
				/>

				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
					disabled={isBusy}
					type="date"
					value={endDate}
					onChange={event => setEndDate(event.currentTarget.value)}
				/>

				<div className="cf:flex cf:flex-wrap cf:gap-3">
					<button
						className="cf:rounded-2xl cf:border cf:border-emerald-300/30 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="submit"
					>
						Load leave report
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
			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}
			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-slate-300">Resolving user names…</p>
			)}

			{summary !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<WorkspaceLeaveTotals summary={summary} />
					<LeaveTypeTotals summary={summary} />
					<GlobalLeaveRows summary={summary} labelForUserID={labelForUserID} />
				</div>
			)}
		</section>
	);
}

/**
 * MetricPill renders one compact metric.
 */
function MetricPill(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * WorkspaceLeaveTotals renders leave totals by workspace.
 */
function WorkspaceLeaveTotals(props: { readonly summary: GlobalLeaveReportSummary }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Workspace totals</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.summary.workspaces.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No workspace leave found for this range.
					</p>
				)}

				{props.summary.workspaces.map(workspace => (
					<div
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={workspace.workspaceId}
					>
						<strong className="cf:text-sm cf:font-black cf:text-white">
							{workspace.workspaceName || workspace.workspaceId}
						</strong>
						<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
							Approved {workspace.approvedCount} · Pending {workspace.pendingCount}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * LeaveTypeTotals renders leave totals by type.
 */
function LeaveTypeTotals(props: { readonly summary: GlobalLeaveReportSummary }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Leave type totals</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.summary.types.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No leave type totals for this range.
					</p>
				)}

				{props.summary.types.map(type => (
					<div
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={type.leaveTypeName}
					>
						<strong className="cf:text-sm cf:font-black cf:text-white">{type.leaveTypeName}</strong>
						<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
							Approved {type.approvedCount} · Pending {type.pendingCount}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * GlobalLeaveRows renders individual global leave rows.
 */
function GlobalLeaveRows(props: {
	readonly summary: GlobalLeaveReportSummary;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:xl:col-span-2">
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Leave rows</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.summary.rows.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No leave rows for this range.
					</p>
				)}

				{props.summary.rows.map(row => (
					<article
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={`${row.workspaceId}:${row.leaveRequest.leaveRequest.id}`}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<div>
								<strong
									className="cf:block cf:text-sm cf:font-black cf:text-white"
									title={row.leaveRequest.leaveRequest.userId}
								>
									{props.labelForUserID(row.leaveRequest.leaveRequest.userId)}
								</strong>
								<span className="cf:mt-1 cf:block cf:text-xs cf:font-bold cf:text-slate-400">
									{row.workspaceName || row.workspaceId}
								</span>
							</div>

							<span className="cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:text-emerald-100">
								{row.leaveRequest.leaveRequest.status}
							</span>
						</div>

						<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">
							{row.leaveRequest.leaveRequest.startDate} → {row.leaveRequest.leaveRequest.endDate} ·{' '}
							{row.leaveRequest.leaveTypeName}
						</p>
					</article>
				))}
			</div>
		</div>
	);
}

/**
 * collectGlobalLeaveUserIDs returns all user IDs visible in the report.
 */
function collectGlobalLeaveUserIDs(summary: GlobalLeaveReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	const userIDs: string[] = [];

	for (const row of summary.rows) {
		userIDs.push(row.leaveRequest.leaveRequest.userId);

		if (row.leaveRequest.leaveRequest.backupUserId.trim() !== '') {
			userIDs.push(row.leaveRequest.leaveRequest.backupUserId);
		}
	}

	return userIDs;
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
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load global leave report.';
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
