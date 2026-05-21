import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Search, UserRoundCheck, UserRoundX } from 'lucide-react';

import { ApiClientError, listStandupConfiguration, listStandupSubmissions } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
	StandupAnswer,
	StandupOccurrenceSummary,
	StandupQuestion,
	StandupSubmissionSortMode,
	StandupSubmissionWithAnswers,
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
import { useUserProfiles } from './useUserProfiles';

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
 * UserLabelResolver returns a display label for one Mattermost user ID.
 */
type UserLabelResolver = (userID: string) => string;

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

		/**
		 * Loads standup configuration and submissions for the selected date.
		 */
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

	const userIDsForProfiles = useMemo(() => collectSummaryUserIDs(summary), [summary]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	const questionsByID = useMemo(() => indexQuestionsByID(questions), [questions]);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Review"
				title="Standup submissions"
				description="Review submitted answers, missing users, and people excluded because they are on approved leave."
				icon={ClipboardList}
				action={
					<CampfireStatusPill tone="green">
						{summary?.submittedUserIds.length ?? 0} submitted
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Members" value={String(summary?.memberUserIds.length ?? 0)} />
					<CampfireMetric
						label="Submitted"
						value={String(summary?.submittedUserIds.length ?? 0)}
						icon={UserRoundCheck}
					/>
					<CampfireMetric
						label="Missing"
						value={String(summary?.missingUserIds.length ?? 0)}
						icon={UserRoundX}
					/>
					<CampfireMetric label="On leave" value={String(summary?.onLeaveUserIds.length ?? 0)} />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_1fr_auto] cf:lg:items-end">
					<FormField label="Occurrence date" htmlFor="campfire-submissions-date">
						<Input
							id="campfire-submissions-date"
							type="date"
							value={occurrenceDate}
							onChange={event => setOccurrenceDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Sort mode" htmlFor="campfire-submissions-sort">
						<select
							id="campfire-submissions-sort"
							className={selectClassName()}
							value={sortMode}
							onChange={event => setSortMode(toSortMode(event.currentTarget.value))}
						>
							<option value="first_submitted">First submitted</option>
							<option value="last_submitted">Last submitted</option>
							<option value="missing_first">Missing first</option>
							<option value="name">Name</option>
						</select>
					</FormField>

					<Button
						type="button"
						variant="secondary"
						onClick={() => setOccurrenceDate(getTodayLocalDateString())}
					>
						<Search className="cf:size-4" />
						Today
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving users…" />}
				{loadState === 'loading' && <LoadingRow label="Loading standup submissions…" />}

				{summary !== null && (
					<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[1fr_1fr]">
						<UserBucket
							title="Missing"
							tone="red"
							userIDs={summary.missingUserIds}
							labelForUserID={labelForUserID}
						/>
						<UserBucket
							title="On leave"
							tone="green"
							userIDs={summary.onLeaveUserIds}
							labelForUserID={labelForUserID}
						/>
					</div>
				)}

				<Separator className="cf:bg-white/10" />

				{summary !== null && summary.submissions.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No submissions for this date"
						description="Submitted standups will appear here after team members answer their forms."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{summary?.submissions.map(row => (
						<SubmissionCard
							row={row}
							questionsByID={questionsByID}
							labelForUserID={labelForUserID}
							key={row.submission.id}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * UserBucket renders a compact list of users by status.
 */
function UserBucket(props: {
	readonly title: string;
	readonly tone: 'green' | 'red';
	readonly userIDs: readonly string[];
	readonly labelForUserID: UserLabelResolver;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">{props.title}</h3>
				<Badge variant="secondary" className="cf:rounded-full">
					{props.userIDs.length}
				</Badge>
			</div>

			<div className="cf:mt-4 cf:flex cf:flex-wrap cf:gap-2">
				{props.userIDs.length === 0 && (
					<span className="cf:text-sm cf:font-medium cf:text-slate-400">None</span>
				)}

				{props.userIDs.map(userID => (
					<span className={userChipClassName(props.tone)} title={userID} key={userID}>
						{props.labelForUserID(userID)}
					</span>
				))}
			</div>
		</div>
	);
}

/**
 * SubmissionCard renders one submitted standup with answers.
 */
function SubmissionCard(props: {
	readonly row: StandupSubmissionWithAnswers;
	readonly questionsByID: Readonly<Record<string, StandupQuestion>>;
	readonly labelForUserID: UserLabelResolver;
}): ReactElement {
	const sortedAnswers = [...props.row.answers].sort((first, second) => {
		const firstQuestion = props.questionsByID[first.questionId];
		const secondQuestion = props.questionsByID[second.questionId];

		return (firstQuestion?.position ?? 0) - (secondQuestion?.position ?? 0);
	});

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white" title={props.row.submission.userId}>
							{props.labelForUserID(props.row.submission.userId)}
						</strong>
						<CampfireStatusPill tone="green">Submitted</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-medium cf:text-slate-400">
						First: {formatDateTime(props.row.submission.firstSubmittedAt)} · Last:{' '}
						{formatDateTime(props.row.submission.lastUpdatedAt)}
					</p>
				</div>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{sortedAnswers.map(answer => (
					<AnswerRow answer={answer} question={props.questionsByID[answer.questionId]} key={answer.id} />
				))}
			</div>
		</article>
	);
}

/**
 * AnswerRow renders one submitted answer.
 */
function AnswerRow(props: {
	readonly answer: StandupAnswer;
	readonly question: StandupQuestion | undefined;
}): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-sm cf:font-black cf:text-white">
					{props.question?.label ?? props.answer.questionId}
				</strong>
				{props.question?.isPrivate === true && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
			</div>
			<p className="cf:mt-2 cf:whitespace-pre-wrap cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
				{formatAnswerValue(props.answer.valueJson)}
			</p>
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
 * MessageRow renders a status or error row.
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
 * collectSummaryUserIDs returns every user ID referenced by the summary.
 */
function collectSummaryUserIDs(summary: StandupOccurrenceSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	const userIDs = new Set<string>();

	for (const userID of summary.memberUserIds) {
		userIDs.add(userID);
	}

	for (const userID of summary.submittedUserIds) {
		userIDs.add(userID);
	}

	for (const userID of summary.missingUserIds) {
		userIDs.add(userID);
	}

	for (const userID of summary.onLeaveUserIds) {
		userIDs.add(userID);
	}

	for (const row of summary.submissions) {
		userIDs.add(row.submission.userId);
	}

	return [...userIDs];
}

/**
 * indexQuestionsByID returns questions keyed by ID.
 */
function indexQuestionsByID(questions: readonly StandupQuestion[]): Readonly<Record<string, StandupQuestion>> {
	const result: Record<string, StandupQuestion> = {};

	for (const question of questions) {
		result[question.id] = question;
	}

	return result;
}

/**
 * formatAnswerValue decodes stored JSON answer values for display.
 */
function formatAnswerValue(valueJson: string): string {
	try {
		const parsed: unknown = JSON.parse(valueJson);

		if (typeof parsed === 'string') {
			return parsed;
		}

		if (typeof parsed === 'boolean') {
			return parsed ? 'Yes' : 'No';
		}

		if (typeof parsed === 'number') {
			return String(parsed);
		}

		if (Array.isArray(parsed)) {
			return parsed.map(value => String(value)).join(', ');
		}

		return JSON.stringify(parsed);
	} catch (_error: unknown) {
		return valueJson;
	}
}

/**
 * toSortMode narrows a string to a known sort mode.
 */
function toSortMode(value: string): StandupSubmissionSortMode {
	if (value === 'name' || value === 'last_submitted' || value === 'missing_first') {
		return value;
	}

	return 'first_submitted';
}

/**
 * userChipClassName returns a user chip style.
 */
function userChipClassName(tone: 'green' | 'red'): string {
	if (tone === 'green') {
		return 'cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100';
	}

	return 'cf:rounded-full cf:border cf:border-red-300/25 cf:bg-red-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-red-100';
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
