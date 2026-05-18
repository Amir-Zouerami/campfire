import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { useUserProfiles } from './useUserProfiles';
import { ApiClientError, getTimeReportSummary } from '../api/client';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from './events';
import type { TimeReportGroupBy, TimeReportRow, TimeReportSummary, Workspace } from '../types/domain';

/**
 * TimeReportSummaryCardProps contains the current workspace.
 */
type TimeReportSummaryCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes the time report card state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const groupByOptions: readonly TimeReportGroupBy[] = ['person', 'project', 'category', 'task', 'day', 'week'];

/**
 * TimeReportSummaryCard renders workspace time totals grouped by common report dimensions.
 */
export function TimeReportSummaryCard(props: TimeReportSummaryCardProps): ReactElement {
	const defaultRange = useMemo(() => getDefaultDateRange(), []);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [groupBy, setGroupBy] = useState<TimeReportGroupBy>('person');
	const [summary, setSummary] = useState<TimeReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const userIDsForProfiles = useMemo(() => collectTimeReportUserIDs(summary), [summary]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	const isBusy = loadState === 'loading';

	useEffect(() => {
		/**
		 * Applies saved time-report filters dispatched by the saved-filter card.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== props.workspace.id || event.detail.reportType !== 'time') {
				return;
			}

			const filter = parseTimeReportFilter(event.detail.filterJson);
			if (filter === null) {
				setMessage(`Saved filter "${event.detail.name}" is not a valid time report filter.`);
				return;
			}

			if (filter.startDate !== undefined) {
				setStartDate(filter.startDate);
			}

			if (filter.endDate !== undefined) {
				setEndDate(filter.endDate);
			}

			if (filter.groupBy !== undefined) {
				setGroupBy(filter.groupBy);
			}

			setMessage(`Applied saved filter "${event.detail.name}". Load the report to refresh results.`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [props.workspace.id]);

	/**
	 * Loads the time report summary from the backend.
	 */
	async function handleLoadSummary(): Promise<void> {
		setLoadState('loading');
		setMessage('');

		try {
			const response = await getTimeReportSummary(props.workspace.id, startDate, endDate, groupBy);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Time report loaded.');
		} catch (error: unknown) {
			setLoadState('error');
			setMessage(errorToMessage(error));
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-teal-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-teal-200">
						Time report
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Workspace time summary
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Review tracked time by person, project, category, task, day, or week for this workspace.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-teal-300/25 cf:bg-teal-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-teal-200">
					{summary === null ? 'No report' : formatMinutes(summary.totalMinutes)}
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[180px_180px_220px_auto] cf:lg:items-end">
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

				<Field label="Group by">
					<select
						className={inputClassName}
						disabled={isBusy}
						value={groupBy}
						onChange={event => setGroupBy(toTimeReportGroupBy(event.currentTarget.value))}
					>
						{groupByOptions.map(option => (
							<option key={option} value={option}>
								{formatLabel(option)}
							</option>
						))}
					</select>
				</Field>

				<button
					className="cf:rounded-2xl cf:border cf:border-teal-300/30 cf:bg-teal-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-teal-50 cf:transition cf:hover:bg-teal-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleLoadSummary()}
				>
					{loadState === 'loading' ? 'Loading…' : 'Load time report'}
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}

			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-xs cf:font-bold cf:text-slate-400">Resolving user names…</p>
			)}

			{summary !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-4">
					<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
						<Metric label="Total time" value={formatMinutes(summary.totalMinutes)} />
						<Metric label="Rows" value={String(summary.rows.length)} />
						<Metric label="Grouped by" value={formatLabel(summary.groupBy)} />
					</div>

					<TimeReportRows
						groupBy={summary.groupBy}
						rows={summary.rows}
						totalMinutes={summary.totalMinutes}
						labelForUserID={labelForUserID}
					/>
				</div>
			)}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-teal-300/60 cf:focus:ring-4 cf:focus:ring-teal-300/15';

/**
 * Field renders a labeled control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-teal-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * Metric renders one summary metric.
 */
function Metric(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-400">
				{props.label}
			</p>
			<p className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:text-white">{props.value}</p>
		</div>
	);
}

/**
 * TimeReportFilter contains saved time report controls this card can apply.
 */
type TimeReportFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly groupBy?: TimeReportGroupBy;
};

/**
 * parseTimeReportFilter validates saved JSON for time report controls.
 */
function parseTimeReportFilter(filterJson: string): TimeReportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);
		if (!isRecord(parsed)) {
			return null;
		}

		const startDate = stringField(parsed, 'startDate') ?? stringField(parsed, 'periodStart');
		const endDate = stringField(parsed, 'endDate') ?? stringField(parsed, 'periodEnd');
		const groupBy = stringField(parsed, 'groupBy');

		return {
			...(startDate === undefined ? {} : { startDate }),
			...(endDate === undefined ? {} : { endDate }),
			...(groupBy === undefined ? {} : { groupBy: toTimeReportGroupBy(groupBy) }),
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
 * TimeReportRows renders aggregated time report rows.
 */
function TimeReportRows(props: {
	readonly groupBy: TimeReportGroupBy;
	readonly rows: readonly TimeReportRow[];
	readonly totalMinutes: number;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	if (props.rows.length === 0) {
		return (
			<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
				No time entries found for this range.
			</p>
		);
	}

	return (
		<div className="cf:grid cf:gap-3">
			{props.rows.map(row => (
				<TimeReportRowCard
					groupBy={props.groupBy}
					key={row.key}
					label={displayLabelForRow(props.groupBy, row, props.labelForUserID)}
					row={row}
					totalMinutes={props.totalMinutes}
				/>
			))}
		</div>
	);
}

/**
 * TimeReportRowCard renders one aggregated row.
 */
function TimeReportRowCard(props: {
	readonly groupBy: TimeReportGroupBy;
	readonly label: string;
	readonly row: TimeReportRow;
	readonly totalMinutes: number;
}): ReactElement {
	const percentage = props.totalMinutes === 0 ? 0 : Math.round((props.row.minutes / props.totalMinutes) * 100);

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:md:flex-row cf:md:items-start cf:md:justify-between">
				<div>
					<strong className="cf:block cf:text-lg cf:font-black cf:text-white" title={props.row.key}>
						{props.label}
					</strong>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
						{formatMinutes(props.row.minutes)} · {props.row.entryCount} entries · {percentage}%
					</p>
					<RowMeta groupBy={props.groupBy} row={props.row} />
				</div>

				<span className="cf:w-fit cf:rounded-full cf:border cf:border-teal-300/25 cf:bg-teal-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-teal-100">
					{formatMinutes(props.row.minutes)}
				</span>
			</div>

			<div className="cf:mt-4 cf:h-2 cf:overflow-hidden cf:rounded-full cf:bg-white/10">
				<div className="cf:h-full cf:rounded-full cf:bg-teal-300/60" style={{ width: `${percentage}%` }} />
			</div>
		</article>
	);
}

/**
 * RowMeta renders group-specific secondary metadata.
 */
function RowMeta(props: { readonly groupBy: TimeReportGroupBy; readonly row: TimeReportRow }): ReactElement | null {
	switch (props.groupBy) {
		case 'day':
		case 'week':
			return (
				<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
					{props.row.periodStart} → {props.row.periodEnd}
				</p>
			);

		case 'task':
			return <p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">Task {props.row.taskId}</p>;

		case 'project':
			return (
				<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
					Project {props.row.projectId || 'none'}
				</p>
			);

		case 'category':
			return (
				<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
					Category {props.row.categoryId || 'none'}
				</p>
			);

		case 'person':
		default:
			return null;
	}
}

/**
 * displayLabelForRow returns the best visible label for one report row.
 */
function displayLabelForRow(
	groupBy: TimeReportGroupBy,
	row: TimeReportRow,
	labelForUserID: (userID: string) => string,
): string {
	if (groupBy === 'person' && row.userId.trim() !== '') {
		return labelForUserID(row.userId);
	}

	if (row.label.trim() !== '') {
		return row.label;
	}

	return row.key;
}

/**
 * collectTimeReportUserIDs returns all Mattermost user IDs displayed by this card.
 */
function collectTimeReportUserIDs(summary: TimeReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	const userIDs = summary.rows.map(row => row.userId);

	return uniqueNonEmptyUserIDs(userIDs);
}

/**
 * uniqueNonEmptyUserIDs trims, de-duplicates, and preserves user ID order.
 */
function uniqueNonEmptyUserIDs(userIDs: readonly string[]): readonly string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const userID of userIDs) {
		const cleanUserID = userID.trim();

		if (cleanUserID === '' || seen.has(cleanUserID)) {
			continue;
		}

		seen.add(cleanUserID);
		result.push(cleanUserID);
	}

	return result;
}

/**
 * getDefaultDateRange returns a practical default report range.
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
 * toTimeReportGroupBy narrows a string to a supported group-by mode.
 */
function toTimeReportGroupBy(value: string): TimeReportGroupBy {
	switch (value) {
		case 'person':
		case 'project':
		case 'category':
		case 'task':
		case 'day':
		case 'week':
			return value;

		default:
			return 'person';
	}
}

/**
 * formatMinutes returns compact hours/minutes display text.
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

	return 'Could not load time report.';
}
