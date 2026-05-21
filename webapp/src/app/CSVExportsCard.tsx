import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { CheckCircle2, Download, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
	ApiClientError,
	exportWorkspaceLeavesCSV,
	exportWorkspaceMissingStandupsCSV,
	exportWorkspaceStandupSubmissionsCSV,
	exportWorkspaceTimeCSV,
} from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { StandupSubmissionSortMode, Workspace } from '@/types/domain';

import { CampfireCardBody, CampfireCardHeader, CampfireMetric, CampfirePanel, CampfireStatusPill } from './campfire-ui';
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

/**
 * CSVExportFilter is a saved filter shape accepted by this card.
 */
type CSVExportFilter = {
	readonly startDate?: string;
	readonly endDate?: string;
	readonly sortMode?: StandupSubmissionSortMode;
};

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
		await runExport('exporting_time', 'Time CSV exported.', async () => {
			const blob = await exportWorkspaceTimeCSV(props.workspace.id, startDate, endDate);
			downloadBlob(blob, buildExportFilename('campfire-time', startDate, endDate));
		});
	}

	/**
	 * Downloads the approved-leave CSV export.
	 */
	async function handleExportLeaves(): Promise<void> {
		await runExport('exporting_leaves', 'Leave CSV exported.', async () => {
			const blob = await exportWorkspaceLeavesCSV(props.workspace.id, startDate, endDate);
			downloadBlob(blob, buildExportFilename('campfire-leaves', startDate, endDate));
		});
	}

	/**
	 * Downloads the standup submissions CSV export.
	 */
	async function handleExportStandups(): Promise<void> {
		await runExport('exporting_standups', 'Standup submissions CSV exported.', async () => {
			const blob = await exportWorkspaceStandupSubmissionsCSV(props.workspace.id, startDate, endDate, sortMode);
			downloadBlob(blob, buildExportFilename('campfire-standup-submissions', startDate, endDate));
		});
	}

	/**
	 * Downloads the missing standups CSV export.
	 */
	async function handleExportMissing(): Promise<void> {
		await runExport('exporting_missing', 'Missing standups CSV exported.', async () => {
			const blob = await exportWorkspaceMissingStandupsCSV(props.workspace.id, startDate, endDate, sortMode);
			downloadBlob(blob, buildExportFilename('campfire-missing-standups', startDate, endDate));
		});
	}

	/**
	 * Runs one CSV export action.
	 */
	async function runExport(
		nextState: ExportState,
		successMessage: string,
		exporter: () => Promise<void>,
	): Promise<void> {
		const validationMessage = validateDateRange(startDate, endDate);
		if (validationMessage !== null) {
			setExportState('error');
			setMessage(validationMessage);
			return;
		}

		setExportState(nextState);
		setMessage('');

		try {
			await exporter();
			setExportState('done');
			setMessage(successMessage);
			toast.success(successMessage);
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setExportState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="CSV"
				title="Workspace CSV exports"
				description="Download raw workspace data for time, leaves, submissions, and missing standups."
				icon={FileDown}
				action={
					<CampfireStatusPill tone={isBusy ? 'ember' : 'green'}>
						{isBusy ? 'Exporting' : 'Ready'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric label="Start" value={startDate} helper="Export window" />
					<CampfireMetric label="End" value={endDate} helper="Export window" />
					<CampfireMetric label="Sort" value={formatLabel(sortMode)} helper="Standup exports" />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-3">
					<FormField label="Start date" htmlFor="campfire-csv-start">
						<Input
							id="campfire-csv-start"
							type="date"
							disabled={isBusy}
							value={startDate}
							onChange={event => setStartDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-csv-end">
						<Input
							id="campfire-csv-end"
							type="date"
							disabled={isBusy}
							value={endDate}
							onChange={event => setEndDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Standup sort" htmlFor="campfire-csv-sort">
						<select
							id="campfire-csv-sort"
							className={selectClassName()}
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
					</FormField>
				</div>

				{message !== '' && <MessageRow state={exportState} message={message} />}

				<Separator className="cf:bg-white/10" />

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<ExportAction
						title="Time entries"
						description="Every time entry in the selected window."
						disabled={isBusy}
						loading={exportState === 'exporting_time'}
						onClick={() => void handleExportTime()}
					/>

					<ExportAction
						title="Approved leaves"
						description="Approved leave rows in the selected window."
						disabled={isBusy}
						loading={exportState === 'exporting_leaves'}
						onClick={() => void handleExportLeaves()}
					/>

					<ExportAction
						title="Standup submissions"
						description="Submitted answers and submission timestamps."
						disabled={isBusy}
						loading={exportState === 'exporting_standups'}
						onClick={() => void handleExportStandups()}
					/>

					<ExportAction
						title="Missing standups"
						description="Missing users by date using the selected sort mode."
						disabled={isBusy}
						loading={exportState === 'exporting_missing'}
						onClick={() => void handleExportMissing()}
					/>
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * ExportAction renders one CSV export card.
 */
function ExportAction(props: {
	readonly title: string;
	readonly description: string;
	readonly disabled: boolean;
	readonly loading: boolean;
	readonly onClick: () => void;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<div>
					<h3 className="cf:text-lg cf:font-black cf:text-white">{props.title}</h3>
					<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
						{props.description}
					</p>
				</div>

				<div className="cf:grid cf:size-11 cf:shrink-0 cf:place-items-center cf:rounded-2xl cf:bg-orange-400/10 cf:text-amber-200">
					<FileDown className="cf:size-5" />
				</div>
			</div>

			<Button className="cf:mt-4 cf:w-full" type="button" disabled={props.disabled} onClick={props.onClick}>
				{props.loading ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Download className="cf:size-4" />}
				Download CSV
			</Button>
		</div>
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
 * MessageRow renders export feedback.
 */
function MessageRow(props: { readonly state: ExportState; readonly message: string }): ReactElement {
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
 * parseCSVExportFilter parses saved filter JSON safely.
 */
function parseCSVExportFilter(filterJson: string): CSVExportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			startDate: typeof parsed.startDate === 'string' ? parsed.startDate : undefined,
			endDate: typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
			sortMode: isSortMode(parsed.sortMode) ? parsed.sortMode : undefined,
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * isSortMode narrows unknown values to standup submission sort modes.
 */
function isSortMode(value: unknown): value is StandupSubmissionSortMode {
	return value === 'first_submitted' || value === 'last_submitted' || value === 'name' || value === 'missing_first';
}

/**
 * toSortMode normalizes select values.
 */
function toSortMode(value: string): StandupSubmissionSortMode {
	return isSortMode(value) ? value : 'first_submitted';
}

/**
 * validateDateRange validates the selected export window.
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
 * getDefaultDateRange returns a recent thirty-day export window.
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

	return 'Could not export CSV.';
}
