import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CheckCircle2, Clipboard, FileText, Loader2, Megaphone, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, getDailyReportPreview, postDailyReportPreview } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
	DailyReportAnswerRow,
	DailyReportPreview,
	DailyReportSubmissionRow,
	StandupSubmissionSortMode,
	Workspace,
} from '@/types/domain';

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
 * DailyReportPreviewCardProps contains workspace data for daily report previewing.
 */
type DailyReportPreviewCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the daily report preview card state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'posting' | 'error';

/**
 * DailyReportFilter is a saved filter shape accepted by this card.
 */
type DailyReportFilter = {
	readonly occurrenceDate?: string;
	readonly sortMode?: StandupSubmissionSortMode;
};

const sortModeOptions: readonly StandupSubmissionSortMode[] = [
	'first_submitted',
	'last_submitted',
	'name',
	'missing_first',
];

/**
 * DailyReportPreviewCard renders a generated daily report and lets authorized users post it.
 */
export function DailyReportPreviewCard(props: DailyReportPreviewCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [preview, setPreview] = useState<DailyReportPreview | null>(null);
	const [message, setMessage] = useState('');

	const isBusy = loadState === 'loading' || loadState === 'posting';

	useEffect(() => {
		/**
		 * Applies saved daily-report filters dispatched by the saved-filter card.
		 */
		function handleApplyReportFilter(event: Event): void {
			if (!isReportFilterApplyEvent(event)) {
				return;
			}

			if (event.detail.workspaceID !== props.workspace.id || event.detail.reportType !== 'daily') {
				return;
			}

			const filter = parseDailyReportFilter(event.detail.filterJson);
			if (filter === null) {
				setMessage(`Saved filter "${event.detail.name}" is not a valid daily report filter.`);
				return;
			}

			if (filter.occurrenceDate !== undefined) {
				setOccurrenceDate(filter.occurrenceDate);
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

	const userIDsForProfiles = useMemo(() => collectDailyReportUserIDs(preview), [preview]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	/**
	 * Loads a generated daily report preview.
	 */
	async function handleGeneratePreview(): Promise<void> {
		if (occurrenceDate.trim() === '') {
			setLoadState('error');
			setMessage('Choose an occurrence date.');
			return;
		}

		setLoadState('loading');
		setMessage('');

		try {
			const response = await getDailyReportPreview(props.workspace.id, occurrenceDate, sortMode);

			setPreview(response.preview);
			setLoadState('ready');
			setMessage('Daily report preview generated.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Copies generated Markdown to the clipboard.
	 */
	async function handleCopyMarkdown(): Promise<void> {
		if (preview === null) {
			setMessage('Generate a daily report preview first.');
			return;
		}

		try {
			await navigator.clipboard.writeText(preview.markdown);
			setMessage('Daily report Markdown copied.');
			toast.success('Markdown copied');
		} catch (_error: unknown) {
			setMessage('Could not copy Markdown.');
			toast.error('Could not copy Markdown');
		}
	}

	/**
	 * Posts the generated daily report preview to the workspace channel.
	 */
	async function handlePostPreview(): Promise<void> {
		if (preview === null) {
			setMessage('Generate a daily report preview first.');
			return;
		}

		setLoadState('posting');
		setMessage('');

		try {
			await postDailyReportPreview(props.workspace.id, {
				occurrenceDate: preview.occurrenceDate,
				sortMode,
			});

			setLoadState('ready');
			setMessage('Daily report posted to the channel.');
			toast.success('Daily report posted');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
			toast.error(errorToMessage(error));
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Daily report"
				title="Daily Markdown preview"
				description="Generate the channel-ready daily standup report, copy Markdown, or post it to the workspace channel."
				icon={FileText}
				action={
					<CampfireStatusPill tone={preview === null ? 'slate' : 'green'}>
						{preview === null ? 'No preview' : 'Preview ready'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Submitted" value={String(preview?.submittedUserIds.length ?? 0)} />
					<CampfireMetric label="Missing" value={String(preview?.missingUserIds.length ?? 0)} />
					<CampfireMetric label="On leave" value={String(preview?.onLeaveUserIds.length ?? 0)} />
					<CampfireMetric label="Rows" value={String(preview?.rows.length ?? 0)} />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_1fr_auto] cf:lg:items-end">
					<FormField label="Occurrence date" htmlFor="campfire-daily-report-date">
						<Input
							id="campfire-daily-report-date"
							type="date"
							disabled={isBusy}
							value={occurrenceDate}
							onChange={event => setOccurrenceDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Sort mode" htmlFor="campfire-daily-report-sort">
						<select
							id="campfire-daily-report-sort"
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
						title="No daily preview yet"
						description="Choose a date and generate a report preview."
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
							<ReportRows rows={preview.rows} labelForUserID={labelForUserID} />

							<MarkdownPreview markdown={preview.markdown} />
						</div>
					</>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * ReportRows renders structured daily-report rows.
 */
function ReportRows(props: {
	readonly rows: readonly DailyReportSubmissionRow[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Structured preview</h3>
				<CampfireStatusPill tone="green">{props.rows.length} rows</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.rows.length === 0 && (
					<CampfireEmpty
						icon={FileText}
						title="No submitted rows"
						description="There are no submitted standups for this preview."
					/>
				)}

				{props.rows.map(row => (
					<SubmissionReportRow row={row} labelForUserID={props.labelForUserID} key={row.userId} />
				))}
			</div>
		</section>
	);
}

/**
 * SubmissionReportRow renders one report submission.
 */
function SubmissionReportRow(props: {
	readonly row: DailyReportSubmissionRow;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const visibleAnswers = props.row.answers
		.filter(answer => answer.showInReport)
		.sort((first, second) => first.position - second.position);

	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-base cf:font-black cf:text-white" title={props.row.userId}>
					{props.labelForUserID(props.row.userId)}
				</strong>
				<CampfireStatusPill tone="green">Submitted</CampfireStatusPill>
			</div>

			<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-500">
				First: {formatDateTime(props.row.firstSubmittedAt)} · Last: {formatDateTime(props.row.lastUpdatedAt)}
			</p>

			<div className="cf:mt-4 cf:grid cf:gap-2">
				{visibleAnswers.length === 0 && (
					<p className="cf:text-sm cf:font-medium cf:text-slate-400">No report-visible answers.</p>
				)}

				{visibleAnswers.map(answer => (
					<AnswerPreview answer={answer} key={answer.questionId} />
				))}
			</div>
		</article>
	);
}

/**
 * AnswerPreview renders one report-visible answer.
 */
function AnswerPreview(props: { readonly answer: DailyReportAnswerRow }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:p-3">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-sm cf:font-black cf:text-white">{props.answer.questionLabel}</strong>
				{props.answer.isPrivate && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
			</div>
			<p className="cf:mt-2 cf:whitespace-pre-wrap cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
				{props.answer.valueText}
			</p>
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
 * collectDailyReportUserIDs returns all user IDs referenced by a daily report preview.
 */
function collectDailyReportUserIDs(preview: DailyReportPreview | null): readonly string[] {
	if (preview === null) {
		return [];
	}

	const userIDs = new Set<string>();

	for (const userID of preview.submittedUserIds) {
		userIDs.add(userID);
	}

	for (const userID of preview.missingUserIds) {
		userIDs.add(userID);
	}

	for (const userID of preview.onLeaveUserIds) {
		userIDs.add(userID);
	}

	for (const row of preview.rows) {
		userIDs.add(row.userId);
	}

	return [...userIDs];
}

/**
 * parseDailyReportFilter parses saved filter JSON safely.
 */
function parseDailyReportFilter(filterJson: string): DailyReportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);

		if (!isRecord(parsed)) {
			return null;
		}

		return {
			occurrenceDate: typeof parsed.occurrenceDate === 'string' ? parsed.occurrenceDate : undefined,
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
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
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

	return 'Could not generate daily report preview.';
}
