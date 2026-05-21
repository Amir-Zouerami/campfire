import { useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, CheckCircle2, Download, Loader2, Search, Umbrella } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, exportGlobalLeaveReportCSV, getGlobalLeaveReportSummary } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
	GlobalLeaveReportRow,
	GlobalLeaveReportSummary,
	GlobalLeaveReportTypeSummary,
	GlobalLeaveReportWorkspaceSummary,
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
 * GlobalLeaveReportsCard renders a global leave dashboard.
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

		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can view global leave reports.');
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
			const response = await getGlobalLeaveReportSummary(startDate, endDate);

			setSummary(response.summary);
			setLoadState('ready');
			setMessage('Global leave report loaded.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Exports the current global leave report controls as CSV.
	 */
	async function handleExportCSV(): Promise<void> {
		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can export global leave reports.');
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
			const blob = await exportGlobalLeaveReportCSV(startDate, endDate);

			downloadBlob(blob, buildExportFilename('campfire-global-leaves', startDate, endDate));
			setLoadState('ready');
			setMessage('Global leave CSV downloaded.');
			toast.success('Global leave CSV downloaded');
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
				title="Global leave report"
				description="System-wide leave visibility across active workspaces. Review approved and pending leave by workspace, type, user, and date range."
				icon={Umbrella}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'No global access'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Approved"
						value={String(summary?.approvedCount ?? 0)}
						helper="Approved leave rows"
					/>
					<CampfireMetric
						label="Pending"
						value={String(summary?.pendingCount ?? 0)}
						helper="Pending leave rows"
					/>
					<CampfireMetric
						label="Workspaces"
						value={String(summary?.workspaceCount ?? 0)}
						helper="Active scope"
					/>
					<CampfireMetric label="Rows" value={String(summary?.rows.length ?? 0)} helper="Selected range" />
				</div>

				<form
					className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-3"
					onSubmit={handleLoadReport}
				>
					<FormField label="Start date" htmlFor="campfire-global-leaves-start">
						<Input
							id="campfire-global-leaves-start"
							type="date"
							disabled={isBusy || !props.isSystemAdmin}
							value={startDate}
							onChange={event => setStartDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-global-leaves-end">
						<Input
							id="campfire-global-leaves-end"
							type="date"
							disabled={isBusy || !props.isSystemAdmin}
							value={endDate}
							onChange={event => setEndDate(event.currentTarget.value)}
						/>
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
						message="Global leave reports are currently limited to system admins in this UI."
					/>
				)}

				<Separator className="cf:bg-white/10" />

				{summary === null && loadState !== 'loading' && (
					<CampfireEmpty
						icon={CalendarX2}
						title="No global leave report loaded"
						description="Choose a date range, then load the global leave report."
					/>
				)}

				{summary !== null && (
					<div className="cf:grid cf:gap-5">
						<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
							<GlobalLeaveWorkspaceTotals workspaces={summary.workspaces} />
							<GlobalLeaveTypeTotals types={summary.types} />
						</div>

						<GlobalLeaveRows rows={summary.rows} labelForUserID={labelForUserID} />
					</div>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * GlobalLeaveWorkspaceTotals renders workspace totals in a global leave report.
 */
function GlobalLeaveWorkspaceTotals(props: {
	readonly workspaces: readonly GlobalLeaveReportWorkspaceSummary[];
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
						icon={Umbrella}
						title="No workspace leave totals"
						description="No leave rows were found in this date range."
					/>
				)}

				{props.workspaces.map(workspace => (
					<WorkspaceLeaveTotalRow workspace={workspace} key={workspace.workspaceId} />
				))}
			</div>
		</section>
	);
}

/**
 * WorkspaceLeaveTotalRow renders one workspace leave total.
 */
function WorkspaceLeaveTotalRow(props: { readonly workspace: GlobalLeaveReportWorkspaceSummary }): ReactElement {
	const total = props.workspace.approvedCount + props.workspace.pendingCount;

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

				<div className="cf:flex cf:flex-wrap cf:gap-2 cf:sm:justify-end">
					<Badge variant="secondary" className="cf:rounded-full">
						Total {total}
					</Badge>
					<Badge variant="secondary" className="cf:rounded-full">
						Approved {props.workspace.approvedCount}
					</Badge>
					<Badge variant="outline" className="cf:rounded-full">
						Pending {props.workspace.pendingCount}
					</Badge>
				</div>
			</div>
		</article>
	);
}

/**
 * GlobalLeaveTypeTotals renders leave-type totals.
 */
function GlobalLeaveTypeTotals(props: { readonly types: readonly GlobalLeaveReportTypeSummary[] }): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Leave type totals</h3>
				<CampfireStatusPill tone="green">{props.types.length} types</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.types.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No leave type totals"
						description="No leave rows were found in this date range."
					/>
				)}

				{props.types.map(type => (
					<LeaveTypeTotalRow type={type} key={type.leaveTypeName} />
				))}
			</div>
		</section>
	);
}

/**
 * LeaveTypeTotalRow renders one leave type total.
 */
function LeaveTypeTotalRow(props: { readonly type: GlobalLeaveReportTypeSummary }): ReactElement {
	const total = props.type.approvedCount + props.type.pendingCount;

	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<strong className="cf:block cf:text-base cf:font-black cf:text-white">
						{props.type.leaveTypeName}
					</strong>
					<span className="cf:mt-1 cf:block cf:text-xs cf:font-bold cf:text-slate-500">
						{props.type.leaveTypeColor || 'No color'}
					</span>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2 cf:sm:justify-end">
					<Badge variant="secondary" className="cf:rounded-full">
						Total {total}
					</Badge>
					<Badge variant="secondary" className="cf:rounded-full">
						Approved {props.type.approvedCount}
					</Badge>
					<Badge variant="outline" className="cf:rounded-full">
						Pending {props.type.pendingCount}
					</Badge>
				</div>
			</div>
		</article>
	);
}

/**
 * GlobalLeaveRows renders all leave rows in the global report.
 */
function GlobalLeaveRows(props: {
	readonly rows: readonly GlobalLeaveReportRow[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Leave rows</h3>
				<CampfireStatusPill tone="green">{props.rows.length} rows</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.rows.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No leave rows"
						description="No approved or pending leave rows were found."
					/>
				)}

				{props.rows.map(row => (
					<GlobalLeaveRow
						row={row}
						labelForUserID={props.labelForUserID}
						key={`${row.workspaceId}-${row.leaveRequest.leaveRequest.id}`}
					/>
				))}
			</div>
		</section>
	);
}

/**
 * GlobalLeaveRow renders one global leave report row.
 */
function GlobalLeaveRow(props: {
	readonly row: GlobalLeaveReportRow;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const request = props.row.leaveRequest.leaveRequest;

	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-base cf:font-black cf:text-white" title={request.userId}>
							{props.labelForUserID(request.userId)}
						</strong>
						<CampfireStatusPill tone={request.status === 'approved' ? 'green' : 'ember'}>
							{formatLabel(request.status)}
						</CampfireStatusPill>
						<CampfireStatusPill tone="slate">{props.row.leaveRequest.leaveTypeName}</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">
						{request.startDate} → {request.endDate}
						{formatDurationDetails(props.row)}
					</p>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<MetaChip label="Workspace" value={props.row.workspaceName} />
						<MetaChip label="Backup" value={backupLabel(request.backupUserId, props.labelForUserID)} />
					</div>

					{request.reason !== '' && (
						<p className="cf:mt-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:p-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
							{request.reason}
						</p>
					)}
				</div>

				<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:px-3 cf:py-2 cf:text-xs cf:font-bold cf:text-slate-300">
					{request.id}
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
 * collectGlobalLeaveUserIDs returns user IDs referenced by global leave rows.
 */
function collectGlobalLeaveUserIDs(summary: GlobalLeaveReportSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	const userIDs: string[] = [];

	for (const row of summary.rows) {
		userIDs.push(row.leaveRequest.leaveRequest.userId);

		if (row.leaveRequest.leaveRequest.backupUserId !== '') {
			userIDs.push(row.leaveRequest.leaveRequest.backupUserId);
		}
	}

	return uniqueStrings(userIDs);
}

/**
 * backupLabel returns a readable backup label.
 */
function backupLabel(backupUserID: string, labelForUserID: (userID: string) => string): string {
	if (backupUserID.trim() === '') {
		return '';
	}

	return labelForUserID(backupUserID);
}

/**
 * formatDurationDetails returns compact leave duration details.
 */
function formatDurationDetails(row: GlobalLeaveReportRow): string {
	const request = row.leaveRequest.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? ' · half day' : ` · half day · ${formatLabel(request.halfDayPart)}`;

		case 'hourly':
			return ` · ${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return '';

		default:
			return '';
	}
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

	return 'Could not load global leave report.';
}
