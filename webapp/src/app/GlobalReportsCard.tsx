import { useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { BarChart3, CheckCircle2, Download, Globe2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, exportGlobalTimeReportCSV, getGlobalTimeReportSummary } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
	GlobalTimeReportSummary,
	GlobalTimeReportWorkspaceSummary,
	TimeReportGroupBy,
	TimeReportRow,
} from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { useUserProfiles } from './useUserProfiles';

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
 * GlobalReportsCard renders a global time dashboard.
 */
export function GlobalReportsCard(props: GlobalReportsCardProps): ReactElement {
	const defaultRange = useMemo(() => getDefaultDateRange(), []);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [startDate, setStartDate] = useState(defaultRange.startDate);
	const [endDate, setEndDate] = useState(defaultRange.endDate);
	const [groupBy, setGroupBy] = useState<TimeReportGroupBy>('person');
	const [summary, setSummary] = useState<GlobalTimeReportSummary | null>(null);
	const [message, setMessage] = useState('');

	const userIDsForProfiles = useMemo(() => collectGlobalTimeUserIDs(summary), [summary]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	const isBusy = loadState === 'loading' || loadState === 'exporting';

	/**
	 * Loads the global time report.
	 */
	async function handleLoadReport(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can view global time reports.');
			return;
		}

		const validationMessage = validateDateRange(startDate, endDate);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getGlobalTimeReportSummary(startDate, endDate, groupBy);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Global time report loaded.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Exports the current global time report controls as CSV.
	 */
	async function handleExportCSV(): Promise<void> {
		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can export global time reports.');
			return;
		}

		const validationMessage = validateDateRange(startDate, endDate);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('exporting');
		setMessage('');

		try {
			const blob = await exportGlobalTimeReportCSV(startDate, endDate, groupBy);

			downloadBlob(blob, buildExportFilename('campfire-global-time', startDate, endDate));
			setLoadState('ready');
			setMessage('Global time CSV downloaded.');
			toast.success('Global time CSV downloaded');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Global reports"
				title="Global time report"
				description="System-wide time summary across active workspaces. Use it for cross-workspace effort, project, category, task, day, and week reporting."
				icon={Globe2}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'No global access'}
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
					<CampfireMetric
						label="Entries"
						value={String(summary?.entryCount ?? 0)}
						helper="Raw time entries"
					/>
					<CampfireMetric
						label="Workspaces"
						value={String(summary?.workspaceCount ?? 0)}
						helper="Active scope"
					/>
					<CampfireMetric
						label="Rows"
						value={String(summary?.rows.length ?? 0)}
						helper={formatLabel(groupBy)}
					/>
				</div>

				<form
					className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-4"
					onSubmit={handleLoadReport}
				>
					<FormField label="Start date" htmlFor="campfire-global-time-start">
						<Input
							id="campfire-global-time-start"
							type="date"
							disabled={isBusy || !props.isSystemAdmin}
							value={startDate}
							onChange={event => setStartDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-global-time-end">
						<Input
							id="campfire-global-time-end"
							type="date"
							disabled={isBusy || !props.isSystemAdmin}
							value={endDate}
							onChange={event => setEndDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Group by" htmlFor="campfire-global-time-group">
						<select
							id="campfire-global-time-group"
							className={selectClassName()}
							disabled={isBusy || !props.isSystemAdmin}
							value={groupBy}
							onChange={event => setGroupBy(toTimeReportGroupBy(event.currentTarget.value))}
						>
							{groupOptions.map(option => (
								<option key={option} value={option}>
									{formatLabel(option)}
								</option>
							))}
						</select>
					</FormField>

					<div className="cf:flex cf:items-end cf:gap-2">
						<Button className="cf:flex-1" type="submit" disabled={isBusy || !props.isSystemAdmin}>
							{loadState === 'loading' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Search className="cf:size-4" />
							)}
							Load
						</Button>

						<Button
							type="button"
							variant="secondary"
							disabled={isBusy || !props.isSystemAdmin}
							onClick={() => void handleExportCSV()}
						>
							{loadState === 'exporting' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Download className="cf:size-4" />
							)}
							CSV
						</Button>
					</div>
				</form>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}

				{!props.isSystemAdmin && (
					<MessageRow
						state="error"
						message="Global reports are currently limited to system admins in this UI."
					/>
				)}

				<Separator className="cf:bg-white/10" />

				{summary === null && loadState !== 'loading' && (
					<CampfireEmpty
						icon={BarChart3}
						title="No global time report loaded"
						description="Choose a date range and grouping, then load the report."
					/>
				)}

				{summary !== null && (
					<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
						<GlobalWorkspaceTotals workspaces={summary.workspaces} />

						<GlobalTimeRows rows={summary.rows} groupBy={summary.groupBy} labelForUserID={labelForUserID} />
					</div>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * GlobalWorkspaceTotals renders workspace totals in a global time report.
 */
function GlobalWorkspaceTotals(props: {
	readonly workspaces: readonly GlobalTimeReportWorkspaceSummary[];
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Workspace totals</h3>
				<CampfireStatusPill tone="ember">{props.workspaces.length} workspaces</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.workspaces.length === 0 && (
					<CampfireEmpty
						icon={BarChart3}
						title="No workspace totals"
						description="No time entries were found in this date range."
					/>
				)}

				{props.workspaces.map(workspace => (
					<WorkspaceTotalRow workspace={workspace} key={workspace.workspaceId} />
				))}
			</div>
		</section>
	);
}

/**
 * WorkspaceTotalRow renders one global workspace total row.
 */
function WorkspaceTotalRow(props: { readonly workspace: GlobalTimeReportWorkspaceSummary }): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<strong className="cf:block cf:text-base cf:font-black cf:text-white">
						{props.workspace.workspaceName}
					</strong>
					<span className="cf:mt-1 cf:block cf:text-xs cf:font-bold cf:text-slate-500">
						{props.workspace.workspaceId}
					</span>
				</div>

				<div className="cf:text-left cf:sm:text-right">
					<p className="cf:text-lg cf:font-black cf:text-white">
						{formatMinutes(props.workspace.totalMinutes)}
					</p>
					<p className="cf:text-xs cf:font-bold cf:text-slate-400">{props.workspace.entryCount} entries</p>
				</div>
			</div>
		</article>
	);
}

/**
 * GlobalTimeRows renders grouped global time rows.
 */
function GlobalTimeRows(props: {
	readonly rows: readonly TimeReportRow[];
	readonly groupBy: TimeReportGroupBy;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Grouped rows</h3>
				<CampfireStatusPill tone="green">{props.rows.length} rows</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.rows.length === 0 && (
					<CampfireEmpty
						icon={BarChart3}
						title="No grouped rows"
						description="No matching global time entries were found."
					/>
				)}

				{props.rows.map(row => (
					<GlobalTimeRow
						row={row}
						groupBy={props.groupBy}
						labelForUserID={props.labelForUserID}
						key={`${row.key}-${row.periodStart}-${row.periodEnd}`}
					/>
				))}
			</div>
		</section>
	);
}

/**
 * GlobalTimeRow renders one grouped global time row.
 */
function GlobalTimeRow(props: {
	readonly row: TimeReportRow;
	readonly groupBy: TimeReportGroupBy;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-base cf:font-black cf:text-white">
							{displayRowLabel(props.row, props.groupBy, props.labelForUserID)}
						</strong>
						<CampfireStatusPill tone="slate">{formatLabel(props.groupBy)}</CampfireStatusPill>
					</div>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<MetaChip label="Period" value={`${props.row.periodStart} → ${props.row.periodEnd}`} />
						<MetaChip label="Entries" value={String(props.row.entryCount)} />
						<MetaChip label="Project" value={props.row.projectId} />
						<MetaChip label="Category" value={props.row.categoryId} />
						<MetaChip label="Task" value={props.row.taskId} />
					</div>
				</div>

				<div className="cf:text-left cf:sm:text-right">
					<p className="cf:text-lg cf:font-black cf:text-white">{formatMinutes(props.row.minutes)}</p>
					<p className="cf:text-xs cf:font-bold cf:text-slate-400">{props.row.entryCount} entries</p>
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
		<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-slate-950/45 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * MessageRow renders load/export feedback.
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
 * collectGlobalTimeUserIDs returns user IDs referenced by global time rows.
 */
function collectGlobalTimeUserIDs(summary: GlobalTimeReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return uniqueStrings(summary.rows.map(row => row.userId));
}

/**
 * displayRowLabel returns the best label for one global time report row.
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
 * toTimeReportGroupBy normalizes select values.
 */
function toTimeReportGroupBy(value: string): TimeReportGroupBy {
	if (value === 'project' || value === 'category' || value === 'task' || value === 'day' || value === 'week') {
		return value;
	}

	return 'person';
}

/**
 * validateDateRange validates report dates.
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
 * downloadBlob downloads a browser blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}

/**
 * buildExportFilename returns a CSV filename.
 */
function buildExportFilename(prefix: string, startDate: string, endDate: string): string {
	return `${prefix}-${startDate}-to-${endDate}.csv`;
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
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
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

	return 'Could not load global time report.';
}
