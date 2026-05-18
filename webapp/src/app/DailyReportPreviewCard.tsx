import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { useUserProfiles } from './useUserProfiles';
import { CAMPFIRE_APPLY_REPORT_FILTER_EVENT, isReportFilterApplyEvent } from './events';
import type { DailyReportPreview, ReportRun, StandupSubmissionSortMode, Workspace } from '../types/domain';
import { ApiClientError, getDailyReportPreview, listDailyReportRuns, postDailyReportPreview } from '../api/client';

/**
 * DailyReportPreviewCardProps contains workspace and refresh data.
 */
type DailyReportPreviewCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the daily report preview loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * ClipboardState describes the copy-to-clipboard interaction state.
 */
type ClipboardState = 'idle' | 'copied' | 'error';

/**
 * PostState describes the post-to-channel interaction state.
 */
type PostState = 'idle' | 'posting' | 'posted' | 'error';

/**
 * DailyReportPreviewCard renders a Markdown preview of the daily report.
 */
export function DailyReportPreviewCard(props: DailyReportPreviewCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [clipboardState, setClipboardState] = useState<ClipboardState>('idle');
	const [postState, setPostState] = useState<PostState>('idle');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [preview, setPreview] = useState<DailyReportPreview | null>(null);
	const [runs, setRuns] = useState<readonly ReportRun[]>([]);
	const [message, setMessage] = useState('');

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

			setMessage(`Applied saved filter "${event.detail.name}".`);
		}

		window.addEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);

		return () => {
			window.removeEventListener(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, handleApplyReportFilter);
		};
	}, [props.workspace.id]);

	useEffect(() => {
		let isActive = true;
		async function loadPreview(): Promise<void> {
			setLoadState('loading');
			setClipboardState('idle');
			setPostState('idle');
			setMessage('');

			try {
				const [previewResponse, runsResponse] = await Promise.all([
					getDailyReportPreview(props.workspace.id, occurrenceDate, sortMode),
					listDailyReportRuns(props.workspace.id, 20),
				]);

				if (!isActive) {
					return;
				}

				setPreview(previewResponse.preview);
				setRuns(runsResponse.runs);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadPreview();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken, occurrenceDate, sortMode]);

	const existingRunForDate = useMemo(
		() =>
			runs.find(
				run =>
					run.reportKind === 'daily' &&
					run.periodStart === occurrenceDate &&
					run.periodEnd === occurrenceDate &&
					run.status === 'posted',
			) ?? null,
		[occurrenceDate, runs],
	);

	const userIDsForProfiles = useMemo(() => collectDailyReportUserIDs(preview, runs), [preview, runs]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	/**
	 * Copies report Markdown to the user's clipboard.
	 */
	async function handleCopy(): Promise<void> {
		if (preview === null) {
			return;
		}

		try {
			await navigator.clipboard.writeText(preview.markdown);
			setClipboardState('copied');
		} catch (_error: unknown) {
			setClipboardState('error');
		}
	}

	/**
	 * Posts the current report preview to the Mattermost channel.
	 */
	async function handlePostToChannel(): Promise<void> {
		if (preview === null || existingRunForDate !== null) {
			return;
		}

		setPostState('posting');
		setMessage('');

		try {
			const response = await postDailyReportPreview(props.workspace.id, {
				occurrenceDate,
				sortMode,
			});

			setPreview(response.preview);
			setRuns(current => [response.run, ...current.filter(run => run.id !== response.run.id)]);
			setPostState('posted');
		} catch (error: unknown) {
			setPostState('error');
			setMessage(errorToMessage(error));
		}
	}

	const isPostDisabled = preview === null || postState === 'posting' || existingRunForDate !== null;

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-fuchsia-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-fuchsia-200">
						Reports
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Daily report preview
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Generate a Markdown preview, post it once, and keep a history of posted daily reports.
					</p>
				</div>

				<div className={existingRunForDate === null ? previewBadgeClassName : postedBadgeClassName}>
					{existingRunForDate === null ? 'Preview' : 'Already posted'}
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_1fr_auto_auto] cf:lg:items-end">
				<Field label="Date">
					<input
						className={inputClassName}
						type="date"
						value={occurrenceDate}
						onChange={event => setOccurrenceDate(event.currentTarget.value)}
					/>
				</Field>

				<Field label="Sort">
					<select
						className={inputClassName}
						value={sortMode}
						onChange={event => setSortMode(toSortMode(event.currentTarget.value))}
					>
						<option value="first_submitted">First submitted</option>
						<option value="last_submitted">Last updated</option>
						<option value="name">Name / user ID</option>
						<option value="missing_first">Missing first</option>
					</select>
				</Field>

				<button
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-fuchsia-300/25 cf:bg-fuchsia-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-fuchsia-50 cf:transition cf:hover:bg-fuchsia-400/30"
					type="button"
					onClick={() => setOccurrenceDate(getTodayLocalDateString())}
				>
					Today
				</button>

				<button
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-emerald-300/25 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					type="button"
					disabled={preview === null}
					onClick={() => void handleCopy()}
				>
					Copy Markdown
				</button>
			</div>

			<div className="cf:mt-4 cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-center">
				<button
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-orange-300/25 cf:bg-orange-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-orange-50 cf:transition cf:hover:bg-orange-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					type="button"
					disabled={isPostDisabled}
					onClick={() => void handlePostToChannel()}
				>
					{postState === 'posting' ? 'Posting…' : 'Post to channel'}
				</button>

				{existingRunForDate !== null && (
					<p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-200">
						Posted by{' '}
						<span title={existingRunForDate.postedBy}>
							{existingRunForDate.postedBy === ''
								? 'unknown'
								: labelForUserID(existingRunForDate.postedBy)}
						</span>{' '}
						at {formatDateTime(existingRunForDate.postedAt)}.
					</p>
				)}
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}

			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-xs cf:font-bold cf:text-slate-400">Resolving user names…</p>
			)}

			{clipboardState === 'copied' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-emerald-200">Copied Markdown.</p>
			)}

			{clipboardState === 'error' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-red-200">
					Could not copy automatically. Select the preview text manually.
				</p>
			)}

			{postState === 'posted' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-emerald-200">
					Posted daily report to the channel.
				</p>
			)}

			{postState === 'error' && message === '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-red-200">
					Could not post the daily report to the channel.
				</p>
			)}

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-5 cf:text-slate-300">Building report preview…</p>}

			{preview !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-4">
					<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
						<Metric label="Submitted" value={String(preview.submittedUserIds.length)} />
						<Metric label="Missing" value={String(preview.missingUserIds.length)} />
						<Metric label="On leave" value={String(preview.onLeaveUserIds.length)} />
						<Metric label="Rows" value={String(preview.rows.length)} />
					</div>
					<div className="cf:grid cf:gap-3 cf:lg:grid-cols-3">
						<UserChipList
							title="Submitted"
							userIds={preview.submittedUserIds}
							tone="emerald"
							labelForUserID={labelForUserID}
						/>
						<UserChipList
							title="Missing"
							userIds={preview.missingUserIds}
							tone="amber"
							labelForUserID={labelForUserID}
						/>
						<UserChipList
							title="On approved leave"
							userIds={preview.onLeaveUserIds}
							tone="sky"
							labelForUserID={labelForUserID}
						/>
					</div>
					<pre className="cf:max-h-[34rem] cf:overflow-auto cf:whitespace-pre-wrap cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:p-5 cf:text-sm cf:leading-6 cf:text-slate-100">
						{' '}
						{preview.markdown}
					</pre>
					<ReportHistory runs={runs} labelForUserID={labelForUserID} />{' '}
				</div>
			)}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-fuchsia-300/60 cf:focus:ring-4 cf:focus:ring-fuchsia-300/15';

const previewBadgeClassName =
	'cf:w-fit cf:rounded-full cf:border cf:border-fuchsia-300/25 cf:bg-fuchsia-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-fuchsia-200';

const postedBadgeClassName =
	'cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-200';

/**
 * Field renders a labeled control shell.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-fuchsia-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * Metric renders a compact count card.
 */
function Metric(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<span className="cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-fuchsia-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-lg cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * UserChipList renders resolved users as compact chips.
 */
function UserChipList(props: {
	readonly title: string;
	readonly userIds: readonly string[];
	readonly tone: 'amber' | 'emerald' | 'sky';
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const toneClassName = userChipToneClassName(props.tone);

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">{props.title}</strong>

			{props.userIds.length === 0 && <p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">Nobody here.</p>}

			{props.userIds.length > 0 && (
				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					{props.userIds.map(userID => (
						<span
							className={`cf:rounded-full cf:border cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold ${toneClassName}`}
							key={userID}
							title={userID}
						>
							{props.labelForUserID(userID)}
						</span>
					))}
				</div>
			)}
		</article>
	);
}

/**
 * userChipToneClassName returns tone-specific chip styles.
 */
function userChipToneClassName(tone: 'amber' | 'emerald' | 'sky'): string {
	switch (tone) {
		case 'amber':
			return 'cf:border-amber-300/20 cf:bg-amber-300/10 cf:text-amber-100';

		case 'emerald':
			return 'cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:text-emerald-100';

		case 'sky':
			return 'cf:border-sky-300/20 cf:bg-sky-300/10 cf:text-sky-100';

		default:
			return 'cf:border-white/10 cf:bg-white/[0.06] cf:text-white';
	}
}

/**
 * ReportHistory renders recent daily report posting history.
 */
function ReportHistory(props: {
	readonly runs: readonly ReportRun[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">Posting history</strong>

			{props.runs.length === 0 && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">No daily reports have been posted yet.</p>
			)}

			{props.runs.length > 0 && (
				<div className="cf:mt-3 cf:grid cf:gap-3">
					{props.runs.map(run => (
						<div
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3"
							key={run.id}
						>
							<div className="cf:flex cf:flex-col cf:gap-2 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
								<div>
									<p className="cf:m-0 cf:text-sm cf:font-black cf:text-white">
										{run.periodStart} · {run.reportKind}
									</p>
									<p className="cf:m-0 cf:mt-1 cf:text-xs cf:text-slate-400">
										Posted by{' '}
										<span title={run.postedBy}>
											{run.postedBy === '' ? 'unknown' : props.labelForUserID(run.postedBy)}
										</span>{' '}
										· {formatDateTime(run.postedAt || run.generatedAt)}
									</p>{' '}
								</div>

								<span
									className={
										run.status === 'posted' ? historyPostedClassName : historyFailedClassName
									}
								>
									{run.status}
								</span>
							</div>

							{run.mattermostPostId !== '' && (
								<p className="cf:m-0 cf:mt-2 cf:text-xs cf:text-slate-500">
									Mattermost post: {run.mattermostPostId}
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</article>
	);
}

const historyPostedClassName =
	'cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-emerald-200';

const historyFailedClassName =
	'cf:w-fit cf:rounded-full cf:border cf:border-red-300/20 cf:bg-red-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-red-200';

/**
 * DailyReportFilter contains saved daily report controls this card can apply.
 */
type DailyReportFilter = {
	readonly occurrenceDate?: string;
	readonly sortMode?: StandupSubmissionSortMode;
};

/**
 * parseDailyReportFilter validates saved JSON for daily report controls.
 */
function parseDailyReportFilter(filterJson: string): DailyReportFilter | null {
	try {
		const parsed: unknown = JSON.parse(filterJson);
		if (!isRecord(parsed)) {
			return null;
		}

		const occurrenceDate = stringField(parsed, 'occurrenceDate') ?? stringField(parsed, 'date');
		const sortMode = stringField(parsed, 'sortMode');

		return {
			...(occurrenceDate === undefined ? {} : { occurrenceDate }),
			...(sortMode === undefined ? {} : { sortMode: toSortMode(sortMode) }),
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
 * collectDailyReportUserIDs returns all Mattermost user IDs displayed by this card.
 */
function collectDailyReportUserIDs(preview: DailyReportPreview | null, runs: readonly ReportRun[]): readonly string[] {
	const userIDs = [
		...runs.map(run => run.postedBy),
		...(preview?.submittedUserIds ?? []),
		...(preview?.missingUserIds ?? []),
		...(preview?.onLeaveUserIds ?? []),
		...(preview?.rows.map(row => row.userId) ?? []),
	];

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
 * toSortMode narrows strings to supported sort modes.
 */
function toSortMode(value: string): StandupSubmissionSortMode {
	switch (value) {
		case 'name':
		case 'first_submitted':
		case 'last_submitted':
		case 'missing_first':
			return value;

		default:
			return 'first_submitted';
	}
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
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	const date = new Date();
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

	return 'Could not build daily report preview.';
}
