import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarDays, CheckCircle2, Clipboard, FileText, Loader2, Megaphone, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, getWeeklyReportPreview, postWeeklyReportPreview } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DailyReportPreview, ReportSortMode, WeeklyReportPreview, Workspace } from '@/types/domain';

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
 * WeeklyReportPreviewCardProps contains workspace data for weekly report previewing.
 */
type WeeklyReportPreviewCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the weekly report preview card state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'posting' | 'error';

/**
 * WeeklyReportFilter is a saved filter shape accepted by this card.
 */
type WeeklyReportFilter = {
	readonly periodStart?: string;
	readonly periodEnd?: string;
	readonly sortMode?: ReportSortMode;
};

const reportSortOptions: readonly ReportSortMode[] = [
	'name',
	'first_submitted',
	'last_submitted',
	'missing_first',
	'blockers_first',
];

/**
 * WeeklyReportPreviewCard renders a generated weekly report and lets authorized users post it.
 */
export function WeeklyReportPreviewCard(props: WeeklyReportPreviewCardProps): ReactElement {
	const defaultRange = useMemo(() => getDefaultWeeklyRange(), []);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [periodStart, setPeriodStart] = useState(defaultRange.periodStart);
	const [periodEnd, setPeriodEnd] = useState(defaultRange.periodEnd);
	const [sortMode, setSortMode] = useState<ReportSortMode>('first_submitted');
	const [preview, setPreview] = useState<WeeklyReportPreview | null>(null);
	const [message, setMessage] = useState('');

	const isBusy = loadState === 'loading' || loadState === 'posting';

	useEffect(() => {
		/**
		 * Applies saved weekly-report filters dispatched by the saved-filter card.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== props.workspace.id || event.detail.reportType !== 'weekly') {
				return;
			}

			const filter = parseWeeklyReportFilter(event.detail.filterJson);
			if (filter === null) {
				setMessage(`Saved filter "${event.detail.name}" is not a valid weekly report filter.`);
				return;
			}

			if (filter.periodStart !== undefined) {
				setPeriodStart(filter.periodStart);
			}

			if (filter.periodEnd !== undefined) {
				setPeriodEnd(filter.periodEnd);
			}

			if (filter.sortMode !== undefined) {
				setSortMode(filter.sortMode);
			}

			setMessage(`Applied saved filter "${event.detail.name}". Generate the preview to refresh results.`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [props.workspace.id]);

	const userIDsForProfiles = useMemo(() => collectWeeklyReportUserIDs(preview), [preview]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	/**
	 * Loads a generated weekly report preview.
	 */
	async function handleGeneratePreview(): Promise<void> {
		const validationMessage = validatePeriod(periodStart, periodEnd);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getWeeklyReportPreview(props.workspace.id, periodStart, periodEnd, sortMode);

			setPreview(response.preview);
			setLoadState('ready');
			setMessage('Weekly report preview generated.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Copies the generated weekly report Markdown to the clipboard.
	 */
	async function handleCopyMarkdown(): Promise<void> {
		if (preview === null) {
			setMessage('Generate a weekly report preview first.');
			return;
		}

		try {
			await navigator.clipboard.writeText(preview.markdown);
			setMessage('Weekly report Markdown copied.');
			toast.success('Markdown copied');
		} catch (_error: unknown) {
			setMessage('Could not copy Markdown.');
			toast.error('Could not copy Markdown');
		}
	}

	/**
	 * Posts the generated weekly report preview to the workspace channel.
	 */
	async function handlePostPreview(): Promise<void> {
		if (preview === null) {
			setMessage('Generate a weekly report preview first.');
			return;
		}

		setLoadState('posting');
		setMessage('');

		try {
			await postWeeklyReportPreview(props.workspace.id, {
				periodStart: preview.periodStart,
				periodEnd: preview.periodEnd,
				sortMode,
			});

			setLoadState('ready');
			setMessage('Weekly report posted to the channel.');
			toast.success('Weekly report posted');
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
				eyebrow="Weekly report"
				title="Weekly ember report"
				description="Generate a compact weekly Markdown summary across daily previews, missing users, leave, and participation totals."
				icon={CalendarDays}
				action={
					<CampfireStatusPill tone={preview === null ? 'slate' : 'green'}>
						{preview === null ? 'No preview' : 'Preview ready'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Submitted" value={String(preview?.submittedCount ?? 0)} />
					<CampfireMetric label="Missing" value={String(preview?.missingCount ?? 0)} />
					<CampfireMetric label="On leave" value={String(preview?.onLeaveCount ?? 0)} />
					<CampfireMetric label="Days" value={String(preview?.dailyPreviews.length ?? 0)} />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_1fr_1fr_auto] cf:lg:items-end">
					<FormField label="Period start" htmlFor="campfire-weekly-report-start">
						<Input
							id="campfire-weekly-report-start"
							type="date"
							disabled={isBusy}
							value={periodStart}
							onChange={event => setPeriodStart(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Period end" htmlFor="campfire-weekly-report-end">
						<Input
							id="campfire-weekly-report-end"
							type="date"
							disabled={isBusy}
							value={periodEnd}
							onChange={event => setPeriodEnd(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Sort mode" htmlFor="campfire-weekly-report-sort">
						<select
							id="campfire-weekly-report-sort"
							className={selectClassName()}
							disabled={isBusy}
							value={sortMode}
							onChange={event => setSortMode(toReportSortMode(event.currentTarget.value))}
						>
							{reportSortOptions.map(option => (
								<option key={option} value={option}>
									{formatLabel(option)}
								</option>
							))}
						</select>
					</FormField>

					<Button type="button" disabled={isBusy} onClick={() => void handleGeneratePreview()}>
						{loadState === 'loading' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Search className="cf:size-4" />
						)}
						Generate
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}

				{preview === null && loadState !== 'loading' && (
					<CampfireEmpty
						icon={FileText}
						title="No weekly preview yet"
						description="Choose a period and generate the weekly report preview."
					/>
				)}

				{preview !== null && (
					<>
						<div className="cf:flex cf:flex-wrap cf:gap-2">
							<Button
								type="button"
								variant="secondary"
								disabled={isBusy}
								onClick={() => void handleCopyMarkdown()}
							>
								<Clipboard className="cf:size-4" />
								Copy Markdown
							</Button>

							<Button type="button" disabled={isBusy} onClick={() => void handlePostPreview()}>
								{loadState === 'posting' ? (
									<Loader2 className="cf:size-4 cf:animate-spin" />
								) : (
									<Megaphone className="cf:size-4" />
								)}
								Post to channel
							</Button>
						</div>

						<Separator className="cf:bg-white/10" />

						<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[1fr_1fr]">
							<WeeklyDailyBreakdown
								dailyPreviews={preview.dailyPreviews}
								labelForUserID={labelForUserID}
							/>

							<MarkdownPreview markdown={preview.markdown} />
						</div>
					</>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * WeeklyDailyBreakdown renders daily participation within a weekly report.
 */
function WeeklyDailyBreakdown(props: {
	readonly dailyPreviews: readonly DailyReportPreview[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Daily breakdown</h3>
				<CampfireStatusPill tone="green">{props.dailyPreviews.length} days</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.dailyPreviews.length === 0 && (
					<CampfireEmpty
						icon={FileText}
						title="No daily previews"
						description="No daily preview rows were returned for this period."
					/>
				)}

				{props.dailyPreviews.map(preview => (
					<DailyPreviewSummary
						preview={preview}
						labelForUserID={props.labelForUserID}
						key={preview.occurrenceDate}
					/>
				))}
			</div>
		</section>
	);
}

/**
 * DailyPreviewSummary renders one daily preview inside a weekly report.
 */
function DailyPreviewSummary(props: {
	readonly preview: DailyReportPreview;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<strong className="cf:text-base cf:font-black cf:text-white">{props.preview.occurrenceDate}</strong>
				<CampfireStatusPill tone="green">{props.preview.submittedUserIds.length} submitted</CampfireStatusPill>
			</div>

			<div className="cf:mt-3 cf:grid cf:gap-2 cf:sm:grid-cols-3">
				<MiniCount label="Submitted" value={props.preview.submittedUserIds.length} />
				<MiniCount label="Missing" value={props.preview.missingUserIds.length} />
				<MiniCount label="On leave" value={props.preview.onLeaveUserIds.length} />
			</div>

			{props.preview.missingUserIds.length > 0 && (
				<div className="cf:mt-3">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-red-100">Missing</p>
					<div className="cf:mt-2 cf:flex cf:flex-wrap cf:gap-2">
						{props.preview.missingUserIds.map(userID => (
							<span
								className="cf:rounded-full cf:border cf:border-red-300/25 cf:bg-red-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-red-100"
								title={userID}
								key={userID}
							>
								{props.labelForUserID(userID)}
							</span>
						))}
					</div>
				</div>
			)}
		</article>
	);
}

/**
 * MiniCount renders a small count tile.
 */
function MiniCount(props: { readonly label: string; readonly value: number }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:p-3">
			<span className="cf:block cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-lg cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * MarkdownPreview renders generated report Markdown.
 */
function MarkdownPreview(props: { readonly markdown: string }): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Markdown</h3>
				<CampfireStatusPill tone="ember">Preview</CampfireStatusPill>
			</div>

			<Textarea className="cf:mt-4 cf:min-h-136 cf:font-mono cf:text-xs" readOnly value={props.markdown} />
		</section>
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
 * MessageRow renders load/post feedback.
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
 * collectWeeklyReportUserIDs returns all user IDs referenced by a weekly preview.
 */
function collectWeeklyReportUserIDs(preview: WeeklyReportPreview | null): readonly string[] {
	if (preview === null) {
		return [];
	}

	const userIDs = new Set<string>();

	for (const dailyPreview of preview.dailyPreviews) {
		for (const userID of dailyPreview.submittedUserIds) {
			userIDs.add(userID);
		}

		for (const userID of dailyPreview.missingUserIds) {
			userIDs.add(userID);
		}

		for (const userID of dailyPreview.onLeaveUserIds) {
			userIDs.add(userID);
		}

		for (const row of dailyPreview.rows) {
			userIDs.add(row.userId);
		}
	}

	return [...userIDs];
}

/**
 * parseWeeklyReportFilter parses saved filter JSON safely.
 */
function parseWeeklyReportFilter(filterJson: string): WeeklyReportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			periodStart: typeof parsed.periodStart === 'string' ? parsed.periodStart : undefined,
			periodEnd: typeof parsed.periodEnd === 'string' ? parsed.periodEnd : undefined,
			sortMode: isReportSortMode(parsed.sortMode) ? parsed.sortMode : undefined,
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * isReportSortMode narrows unknown values to report sort modes.
 */
function isReportSortMode(value: unknown): value is ReportSortMode {
	return (
		value === 'name' ||
		value === 'first_submitted' ||
		value === 'last_submitted' ||
		value === 'missing_first' ||
		value === 'blockers_first'
	);
}

/**
 * toReportSortMode normalizes select values.
 */
function toReportSortMode(value: string): ReportSortMode {
	return isReportSortMode(value) ? value : 'first_submitted';
}

/**
 * validatePeriod validates the selected report period.
 */
function validatePeriod(periodStart: string, periodEnd: string): string | null {
	if (periodStart.trim() === '' || periodEnd.trim() === '') {
		return 'Choose a period start and end date.';
	}

	if (periodStart > periodEnd) {
		return 'Period start cannot be after period end.';
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
 * getDefaultWeeklyRange returns the current Monday-to-Sunday local week.
 */
function getDefaultWeeklyRange(): { readonly periodStart: string; readonly periodEnd: string } {
	const today = new Date();
	const weekday = today.getDay();
	const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
	const sundayOffset = mondayOffset + 6;

	return {
		periodStart: dateToLocalDateString(addDays(today, mondayOffset)),
		periodEnd: dateToLocalDateString(addDays(today, sundayOffset)),
	};
}

/**
 * addDays returns a copy of date moved by the given number of days.
 */
function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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

	return 'Could not generate weekly report preview.';
}
