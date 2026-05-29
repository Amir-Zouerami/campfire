import type { ReactElement } from 'react';
import { MessageSquareText } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
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
		<div className="campfire-submission-stage">
			{props.submissions.length === 0 ? (
				<CampfireEmpty
					className="campfire-submission-empty"
					icon={MessageSquareText}
					title="No submissions yet"
					description="Submitted standups for the selected date will appear here."
				/>
			) : (
				<div className="campfire-submission-stack">
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
		</div>
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
		<article className="campfire-submission-card">
			<div className="campfire-submission-card-header">
				<div className="campfire-submission-user-copy">
					<p>{props.labelForUserID(submission.userId)}</p>
					<h4>{submission.occurrenceDate}</h4>
				</div>

				<CampfireStatusPill tone="green">Submitted</CampfireStatusPill>
			</div>

			<div className="campfire-submission-meta-grid">
				<SubmissionMeta label="First submitted" value={formatDateTime(submission.firstSubmittedAt)} />
				<SubmissionMeta label="Last updated" value={formatDateTime(submission.lastUpdatedAt)} />
			</div>

			<div className="campfire-answer-stack">
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
		<div className="campfire-submission-meta">
			<p>{props.label}</p>
			<strong title={props.value}>{props.value}</strong>
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
		<div className={props.highlight ? 'campfire-answer-row campfire-answer-row--attention' : 'campfire-answer-row'}>
			<div className="campfire-answer-row-header">
				<strong>{props.question?.label ?? 'Unknown question'}</strong>

				{props.question?.isPrivate === true && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
				{props.highlight && <CampfireStatusPill tone="red">Needs attention</CampfireStatusPill>}
			</div>

			<p>{props.value.trim() === '' ? '—' : props.value}</p>
		</div>
	);
}
