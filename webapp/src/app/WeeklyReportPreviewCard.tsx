import { useMemo, useState, type ReactElement } from 'react';

import { ApiClientError, getWeeklyReportPreview, postWeeklyReportPreview } from '../api/client';
import type { ReportSortMode, WeeklyReportPreview, Workspace } from '../types/domain';

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

	/**
	 * Loads a generated weekly report preview.
	 */
	async function handleGeneratePreview(): Promise<void> {
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
			return;
		}

		try {
			await navigator.clipboard.writeText(preview.markdown);
			setMessage('Weekly report Markdown copied.');
		} catch {
			setMessage('Could not copy Markdown.');
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
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-fuchsia-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-fuchsia-200">
						Weekly summary
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Weekly report preview
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Generate a weekly summary from daily standup data, copy the Markdown, or post it to the
						workspace channel.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-fuchsia-300/25 cf:bg-fuchsia-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-fuchsia-200">
					{preview === null ? 'No preview' : `${preview.dailyPreviews.length} days`}
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-[180px_180px_220px_auto] cf:lg:items-end">
				<div>
					<label
						className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
						htmlFor="campfire-weekly-report-start"
					>
						Period start
					</label>
					<input
						className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:focus:border-fuchsia-300/45"
						disabled={isBusy}
						id="campfire-weekly-report-start"
						type="date"
						value={periodStart}
						onChange={event => setPeriodStart(event.currentTarget.value)}
					/>
				</div>

				<div>
					<label
						className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
						htmlFor="campfire-weekly-report-end"
					>
						Period end
					</label>
					<input
						className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:focus:border-fuchsia-300/45"
						disabled={isBusy}
						id="campfire-weekly-report-end"
						type="date"
						value={periodEnd}
						onChange={event => setPeriodEnd(event.currentTarget.value)}
					/>
				</div>

				<div>
					<label
						className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
						htmlFor="campfire-weekly-report-sort"
					>
						Sort mode
					</label>
					<select
						className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:focus:border-fuchsia-300/45"
						disabled={isBusy}
						id="campfire-weekly-report-sort"
						value={sortMode}
						onChange={event => setSortMode(event.currentTarget.value as ReportSortMode)}
					>
						{reportSortOptions.map(option => (
							<option key={option} value={option}>
								{formatLabel(option)}
							</option>
						))}
					</select>
				</div>

				<button
					className="cf:rounded-2xl cf:border cf:border-fuchsia-300/30 cf:bg-fuchsia-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-fuchsia-50 cf:transition cf:hover:bg-fuchsia-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
					disabled={isBusy}
					type="button"
					onClick={() => void handleGeneratePreview()}
				>
					{loadState === 'loading' ? 'Generating…' : 'Generate weekly preview'}
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{preview !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-4">
					<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
						<MetricCard label="Submitted" value={String(preview.submittedCount)} />
						<MetricCard label="Missing" value={String(preview.missingCount)} />
						<MetricCard label="On leave" value={String(preview.onLeaveCount)} />
					</div>

					<div>
						<label
							className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
							htmlFor="campfire-weekly-report-markdown"
						>
							Markdown
						</label>
						<textarea
							className="cf:min-h-80 cf:w-full cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:p-4 cf:font-mono cf:text-sm cf:leading-6 cf:text-slate-100 cf:outline-none"
							id="campfire-weekly-report-markdown"
							readOnly={true}
							value={preview.markdown}
						/>
					</div>

					<div className="cf:flex cf:flex-wrap cf:gap-3">
						<button
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-5 cf:py-3 cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1]"
							type="button"
							onClick={() => void handleCopyMarkdown()}
						>
							Copy Markdown
						</button>

						<button
							className="cf:rounded-2xl cf:border cf:border-fuchsia-300/30 cf:bg-fuchsia-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-fuchsia-50 cf:transition cf:hover:bg-fuchsia-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
							disabled={isBusy}
							type="button"
							onClick={() => void handlePostPreview()}
						>
							{loadState === 'posting' ? 'Posting…' : 'Post weekly report'}
						</button>
					</div>
				</div>
			)}
		</section>
	);
}

/**
 * MetricCard renders one weekly report metric.
 */
function MetricCard(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-400">
				{props.label}
			</p>
			<p className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:text-white">{props.value}</p>
		</div>
	);
}

/**
 * getDefaultWeeklyRange returns Monday through Sunday for the current local week.
 */
function getDefaultWeeklyRange(): { readonly periodStart: string; readonly periodEnd: string } {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

	const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
	const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

	return {
		periodStart: dateToLocalDateString(monday),
		periodEnd: dateToLocalDateString(sunday),
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
 * formatLabel returns a human-readable enum label.
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

	return 'Could not update weekly report preview.';
}
