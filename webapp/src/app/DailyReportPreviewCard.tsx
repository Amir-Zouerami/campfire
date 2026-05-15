import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, getDailyReportPreview } from '../api/client';
import type { DailyReportPreview, StandupSubmissionSortMode, Workspace } from '../types/domain';

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
 * DailyReportPreviewCard renders a Markdown preview of the daily report.
 */
export function DailyReportPreviewCard(props: DailyReportPreviewCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [clipboardState, setClipboardState] = useState<ClipboardState>('idle');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [preview, setPreview] = useState<DailyReportPreview | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadPreview(): Promise<void> {
			setLoadState('loading');
			setClipboardState('idle');
			setMessage('');

			try {
				const response = await getDailyReportPreview(props.workspace.id, occurrenceDate, sortMode);

				if (!isActive) {
					return;
				}

				setPreview(response.preview);
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
						Generate a Markdown preview from submitted standups, missing users, and approved leave. Posting
						and approval workflow come later.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-fuchsia-300/25 cf:bg-fuchsia-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-fuchsia-200">
					Markdown
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

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{clipboardState === 'copied' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-emerald-200">Copied Markdown.</p>
			)}

			{clipboardState === 'error' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-red-200">
					Could not copy automatically. Select the preview text manually.
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

					<pre className="cf:max-h-[34rem] cf:overflow-auto cf:whitespace-pre-wrap cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:p-5 cf:text-sm cf:leading-6 cf:text-slate-100">
						{preview.markdown}
					</pre>
				</div>
			)}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-fuchsia-300/60 cf:focus:ring-4 cf:focus:ring-fuchsia-300/15';

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
