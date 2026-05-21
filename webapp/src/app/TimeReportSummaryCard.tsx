import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BarChart3, CheckCircle2, Clock3, Loader2, Search } from 'lucide-react';

import { ApiClientError, getTimeReportSummary } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { TimeReportGroupBy, TimeReportRow, TimeReportSummary, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from './events';
import { useUserProfiles } from './useUserProfiles';

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

/**
 * TimeReportFilter is a saved filter shape accepted by this card.
 */
type TimeReportFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly groupBy?: TimeReportGroupBy;
};

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
		const validationMessage = validateDateRange(startDate, endDate);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

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
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Time report"
				title="Workspace time summary"
				description="Group tracked time by person, project, category, task, day, or week."
				icon={BarChart3}
				action={
					<CampfireStatusPill tone="green">
						<Clock3 className="cf:size-3.5" />
						{formatMinutes(summary?.totalMinutes ?? 0)}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Total time"
						value={formatMinutes(summary?.totalMinutes ?? 0)}
						helper="Selected range"
					/>
					<CampfireMetric label="Rows" value={String(summary?.rows.length ?? 0)} helper="Grouped result" />
					<CampfireMetric label="Group by" value={formatLabel(groupBy)} helper="Current grouping" />
					<CampfireMetric label="Range" value={rangeLabel(startDate, endDate)} helper="Filter window" />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_1fr_1fr_auto] cf:lg:items-end">
					<FormField label="Start date" htmlFor="campfire-time-report-start">
						<Input
							id="campfire-time-report-start"
							type="date"
							disabled={isBusy}
							value={startDate}
							onChange={event => setStartDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-time-report-end">
						<Input
							id="campfire-time-report-end"
							type="date"
							disabled={isBusy}
							value={endDate}
							onChange={event => setEndDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Group by" htmlFor="campfire-time-report-group-by">
						<select
							id="campfire-time-report-group-by"
							className={selectClassName()}
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
					</FormField>

					<Button type="button" disabled={isBusy} onClick={() => void handleLoadSummary()}>
						{isBusy ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Search className="cf:size-4" />}
						Load
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}

				<Separator className="cf:bg-white/10" />

				{summary === null && loadState !== 'loading' && (
					<CampfireEmpty
						icon={BarChart3}
						title="No time report loaded"
						description="Choose a date range and grouping, then load the report."
					/>
				)}

				{summary !== null && summary.rows.length === 0 && (
					<CampfireEmpty
						icon={Clock3}
						title="No time entries in this range"
						description="Time rows will appear here after users log time against tasks."
					/>
				)}

				{summary !== null && summary.rows.length > 0 && (
					<div className="cf:grid cf:gap-3">
						{summary.rows.map(row => (
							<TimeReportRowCard
								key={`${row.key}-${row.periodStart}-${row.periodEnd}`}
								row={row}
								groupBy={summary.groupBy}
								labelForUserID={labelForUserID}
							/>
						))}
					</div>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * TimeReportRowCard renders one grouped time report row.
 */
function TimeReportRowCard(props: {
	readonly row: TimeReportRow;
	readonly groupBy: TimeReportGroupBy;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">
							{displayRowLabel(props.row, props.groupBy, props.labelForUserID)}
						</strong>
						<CampfireStatusPill tone="ember">{formatLabel(props.groupBy)}</CampfireStatusPill>
					</div>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<MetaChip label="Period" value={`${props.row.periodStart} → ${props.row.periodEnd}`} />
						<MetaChip label="Entries" value={String(props.row.entryCount)} />
						<MetaChip label="Project" value={props.row.projectId} />
						<MetaChip label="Category" value={props.row.categoryId} />
						<MetaChip label="Task" value={props.row.taskId} />
					</div>
				</div>

				<div className="cf:rounded-2xl cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-4 cf:py-3 cf:text-right">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-emerald-100">Time</p>
					<p className="cf:mt-1 cf:text-xl cf:font-black cf:text-white">{formatMinutes(props.row.minutes)}</p>
				</div>
			</div>
		</article>
	);
}

/**
 * FormField renders a labeled field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}

/**
 * MetaChip renders optional row metadata.
 */
function MetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/5 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * MessageRow renders load feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * collectTimeReportUserIDs returns report user IDs that need display names.
 */
function collectTimeReportUserIDs(summary: TimeReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return summary.rows.map(row => row.userId).filter(userID => userID.trim() !== '');
}

/**
 * displayRowLabel returns the best label for one report row.
 */
function displayRowLabel(
	row: TimeReportRow,
	groupBy: TimeReportGroupBy,
	labelForUserID: (userID: string) => string,
): string {
	if (groupBy === 'person' && row.userId.trim() !== '') {
		return labelForUserID(row.userId);
	}

	if (row.label.trim() !== '') {
		return row.label;
	}

	if (row.key.trim() !== '') {
		return row.key;
	}

	return 'Unlabeled';
}

/**
 * parseTimeReportFilter parses saved filter JSON safely.
 */
function parseTimeReportFilter(filterJson: string): TimeReportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			startDate: typeof parsed.startDate === 'string' ? parsed.startDate : undefined,
			endDate: typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
			groupBy: isTimeReportGroupBy(parsed.groupBy) ? parsed.groupBy : undefined,
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * isTimeReportGroupBy narrows unknown values to supported grouping modes.
 */
function isTimeReportGroupBy(value: unknown): value is TimeReportGroupBy {
	return (
		value === 'person' ||
		value === 'project' ||
		value === 'category' ||
		value === 'task' ||
		value === 'day' ||
		value === 'week'
	);
}

/**
 * toTimeReportGroupBy normalizes select values.
 */
function toTimeReportGroupBy(value: string): TimeReportGroupBy {
	return isTimeReportGroupBy(value) ? value : 'person';
}

/**
 * validateDateRange validates the selected local-date range.
 */
function validateDateRange(startDate: string, endDate: string): string | null {
	if (startDate.trim() === '' || endDate.trim() === '') {
		return 'Choose a start and end date.';
	}

	if (startDate > endDate) {
		return 'Start date cannot be after end date.';
	}

	return null;
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
}

/**
 * getDefaultDateRange returns a recent thirty-day report window.
 */
function getDefaultDateRange(): { readonly startDate: string; readonly endDate: string } {
	const endDate = getTodayLocalDateString();

	return {
		startDate: addDaysToLocalDate(endDate, -30),
		endDate,
	};
}

/**
 * addDaysToLocalDate adds days to a YYYY-MM-DD local date string.
 */
function addDaysToLocalDate(localDate: string, days: number): string {
	const parts = localDate.split('-');

	if (parts.length !== 3) {
		return getTodayLocalDateString();
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return getTodayLocalDateString();
	}

	return dateToLocalDateString(new Date(year, month - 1, day + days));
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	return dateToLocalDateString(new Date());
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
 * rangeLabel formats a compact date range.
 */
function rangeLabel(startDate: string, endDate: string): string {
	return `${startDate} → ${endDate}`;
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
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * isRecord narrows unknown values to indexable records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
