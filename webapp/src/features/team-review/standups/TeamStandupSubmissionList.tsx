import type { ReactElement } from 'react';
import { MessageSquareText } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import type { StandupQuestion, StandupSubmissionWithAnswers } from '@/types/domain';

import { answerShouldHighlight, formatAnswerValue, formatDateTime } from './team-standups.helpers';

/**
 * TeamStandupSubmissionListProps contains submitted standup rows.
 */
type TeamStandupSubmissionListProps = {
	readonly submissions: readonly StandupSubmissionWithAnswers[];
	readonly questionsByID: Readonly<Record<string, StandupQuestion>>;
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupSubmissionList renders submitted standups for one occurrence date.
 */
export function TeamStandupSubmissionList(props: TeamStandupSubmissionListProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Submissions
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Submitted updates
				</h3>
			</div>

			{props.submissions.length === 0 ? (
				<CampfireEmpty
					icon={MessageSquareText}
					title="No submissions yet"
					description="Submitted standups for the selected date will appear here."
				/>
			) : (
				<div className="cf:grid cf:gap-4">
					{props.submissions.map(item => (
						<TeamStandupSubmissionCard
							key={item.submission.id}
							item={item}
							questionsByID={props.questionsByID}
							labelForUserID={props.labelForUserID}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * TeamStandupSubmissionCard renders one submitted standup with answers.
 */
function TeamStandupSubmissionCard(props: {
	readonly item: StandupSubmissionWithAnswers;
	readonly questionsByID: Readonly<Record<string, StandupQuestion>>;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const submission = props.item.submission;

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-4">
				<div className="cf:min-w-0">
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{props.labelForUserID(submission.userId)}
					</p>
					<h4 className="cf:mt-1 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-foreground">
						{submission.occurrenceDate}
					</h4>
				</div>

				<CampfireStatusPill tone="green">Submitted</CampfireStatusPill>
			</div>

			<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
				<SubmissionMeta label="First submitted" value={formatDateTime(submission.firstSubmittedAt)} />
				<SubmissionMeta label="Last updated" value={formatDateTime(submission.lastUpdatedAt)} />
			</div>

			<div className="cf:grid cf:gap-3">
				{props.item.answers.map(answer => {
					const question = props.questionsByID[answer.questionId];

					return (
						<AnswerRow
							key={answer.id}
							question={question}
							value={formatAnswerValue(answer.valueJson)}
							highlight={answerShouldHighlight(answer, question)}
						/>
					);
				})}
			</div>
		</article>
	);
}

/**
 * SubmissionMeta renders one submitted timestamp detail.
 */
function SubmissionMeta(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3">
			<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">{props.label}</p>
			<p className="cf:mt-1 cf:truncate cf:text-sm cf:font-bold cf:text-slate-200" title={props.value}>
				{props.value}
			</p>
		</div>
	);
}

/**
 * AnswerRow renders one submitted answer.
 */
function AnswerRow(props: {
	readonly question: StandupQuestion | undefined;
	readonly value: string;
	readonly highlight: boolean;
}): ReactElement {
	return (
		<div
			className={
				props.highlight
					? 'cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/20 cf:p-4'
					: 'cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4'
			}
		>
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-sm cf:font-black cf:text-white">
					{props.question?.label ?? 'Unknown question'}
				</strong>

				{props.question?.isPrivate === true && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
				{props.highlight && <CampfireStatusPill tone="red">Needs attention</CampfireStatusPill>}
			</div>

			<p className="cf:mt-2 cf:whitespace-pre-wrap cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
				{props.value.trim() === '' ? '—' : props.value}
			</p>
		</div>
	);
}
