import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, listStandupConfiguration, listStandupSubmissions } from '../api/client';
import type {
	StandupAnswer,
	StandupOccurrenceSummary,
	StandupQuestion,
	StandupSubmissionSortMode,
	StandupSubmissionWithAnswers,
	Workspace,
} from '../types/domain';

/**
 * StandupSubmissionsCardProps contains workspace and refresh data.
 */
type StandupSubmissionsCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the submissions card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * StandupSubmissionsCard renders submissions and missing users for one date.
 */
export function StandupSubmissionsCard(props: StandupSubmissionsCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const [summary, setSummary] = useState<StandupOccurrenceSummary | null>(null);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [configurationResponse, submissionsResponse] = await Promise.all([
					listStandupConfiguration(props.workspace.id),
					listStandupSubmissions({
						workspaceId: props.workspace.id,
						occurrenceDate,
						sortMode,
					}),
				]);

				if (!isActive) {
					return;
				}

				setQuestions(configurationResponse.questions);
				setSummary(submissionsResponse);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadData();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken, occurrenceDate, sortMode]);

	const questionsByID = useMemo(() => groupQuestionsByID(questions), [questions]);
	const displaySubmissions = useMemo(
		() => orderSubmissionsForDisplay(summary?.submissions ?? [], sortMode),
		[summary, sortMode],
	);

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-sky-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-sky-200">
						Submissions
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Standup submissions
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						See who submitted, who is missing, and who is skipped because they are on approved leave.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-sky-300/25 cf:bg-sky-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-sky-200">
					{summary?.submittedUserIds.length ?? 0} submitted
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_1fr_auto] cf:lg:items-end">
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
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-sky-300/25 cf:bg-sky-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-sky-50 cf:transition cf:hover:bg-sky-400/30"
					type="button"
					onClick={() => setOccurrenceDate(getTodayLocalDateString())}
				>
					Today
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-5 cf:text-slate-300">Loading submissions…</p>}

			{summary !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-4">
					<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
						<Metric label="Members" value={String(summary.memberUserIds.length)} />
						<Metric label="Submitted" value={String(summary.submittedUserIds.length)} />
						<Metric label="Missing" value={String(summary.missingUserIds.length)} />
						<Metric label="On leave" value={String(summary.onLeaveUserIds.length)} />
					</div>

					{sortMode === 'missing_first' && (
						<UserList title="Missing" userIds={summary.missingUserIds} tone="amber" />
					)}

					<UserList title="On approved leave" userIds={summary.onLeaveUserIds} tone="emerald" />

					{displaySubmissions.length === 0 && (
						<p className="cf:m-0 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4 cf:text-slate-300">
							No submissions for this date yet.
						</p>
					)}

					{displaySubmissions.map(submission => (
						<SubmissionCard
							key={submission.submission.id}
							submission={submission}
							questionsByID={questionsByID}
						/>
					))}

					{sortMode !== 'missing_first' && (
						<UserList title="Missing" userIds={summary.missingUserIds} tone="amber" />
					)}
				</div>
			)}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-sky-300/60 cf:focus:ring-4 cf:focus:ring-sky-300/15';

/**
 * Field renders a labeled control shell.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-sky-200">
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
			<span className="cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-sky-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-lg cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * UserList renders a compact list of user IDs.
 */
function UserList(props: {
	readonly title: string;
	readonly userIds: readonly string[];
	readonly tone: 'amber' | 'emerald';
}): ReactElement {
	const toneClassName =
		props.tone === 'amber'
			? 'cf:border-amber-300/20 cf:bg-amber-300/10 cf:text-amber-100'
			: 'cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:text-emerald-100';

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
						>
							{userID}
						</span>
					))}
				</div>
			)}
		</article>
	);
}

/**
 * SubmissionCard renders one submitted standup.
 */
function SubmissionCard(props: {
	readonly submission: StandupSubmissionWithAnswers;
	readonly questionsByID: Readonly<Record<string, StandupQuestion>>;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
						User {props.submission.submission.userId}
					</strong>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
						First submitted: {formatDateTime(props.submission.submission.firstSubmittedAt)}
					</p>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
						Last updated: {formatDateTime(props.submission.submission.lastUpdatedAt)}
					</p>
				</div>

				<span className="cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-200">
					{props.submission.submission.status}
				</span>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.submission.answers.map(answer => (
					<AnswerRow answer={answer} question={props.questionsByID[answer.questionId]} key={answer.id} />
				))}
			</div>
		</article>
	);
}

/**
 * AnswerRow renders one standup answer with question context.
 */
function AnswerRow(props: {
	readonly answer: StandupAnswer;
	readonly question: StandupQuestion | undefined;
}): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3">
			<strong className="cf:block cf:text-sm cf:font-black cf:text-slate-100">
				{props.question?.prompt || props.question?.label || props.answer.questionId}
			</strong>
			<p className="cf:m-0 cf:mt-2 cf:whitespace-pre-wrap cf:text-sm cf:leading-6 cf:text-slate-300">
				{answerValueToText(props.answer.valueJson)}
			</p>
		</div>
	);
}

/**
 * groupQuestionsByID groups questions by ID.
 */
function groupQuestionsByID(questions: readonly StandupQuestion[]): Readonly<Record<string, StandupQuestion>> {
	const result: Record<string, StandupQuestion> = {};

	for (const question of questions) {
		result[question.id] = question;
	}

	return result;
}

/**
 * orderSubmissionsForDisplay applies frontend-only missing-first display behavior.
 */
function orderSubmissionsForDisplay(
	submissions: readonly StandupSubmissionWithAnswers[],
	sortMode: StandupSubmissionSortMode,
): readonly StandupSubmissionWithAnswers[] {
	if (sortMode !== 'last_submitted') {
		return submissions;
	}

	return [...submissions].sort((first, second) =>
		first.submission.lastUpdatedAt.localeCompare(second.submission.lastUpdatedAt),
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
 * answerValueToText converts stored JSON answer text into a human-readable label.
 */
function answerValueToText(valueJson: string): string {
	try {
		const parsed: unknown = JSON.parse(valueJson);

		if (typeof parsed === 'string') {
			return parsed;
		}

		if (typeof parsed === 'number' || typeof parsed === 'boolean') {
			return String(parsed);
		}

		if (Array.isArray(parsed)) {
			return parsed.map(value => String(value)).join(', ');
		}

		if (parsed === null) {
			return '';
		}

		return JSON.stringify(parsed);
	} catch (_error: unknown) {
		return valueJson;
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

	return 'Could not load standup submissions.';
}
