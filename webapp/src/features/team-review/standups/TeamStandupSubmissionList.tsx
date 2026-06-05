import type { ReactElement } from 'react';
import { MessageSquareText } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
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
		<div className="campfire-submission-stage campfire-submission-stage--flat">
			{props.submissions.length === 0 ? (
				<CampfireEmpty
					className="campfire-submission-empty"
					icon={MessageSquareText}
					title="No submissions yet"
					description="Submitted standups for the selected date will appear here."
				/>
			) : (
				<div className="campfire-submission-stack campfire-submission-stack--readable">
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
	const userLabel = props.labelForUserID(submission.userId);

	return (
		<article className="campfire-submission-card campfire-submission-card--minimal">
			<header className="campfire-submission-card-header">
				<div className="campfire-submission-user-copy">
					<CampfireBidiText title={userLabel}>{userLabel}</CampfireBidiText>
					<span>{submission.occurrenceDate}</span>
				</div>

				<CampfireStatusPill tone="green">Submitted</CampfireStatusPill>
			</header>

			<div className="campfire-submission-meta-row">
				<SubmissionMeta label="First submitted" value={formatDateTime(submission.firstSubmittedAt)} />
				<SubmissionMeta label="Last updated" value={formatDateTime(submission.lastUpdatedAt)} />
			</div>

			<div className="campfire-answer-stack campfire-answer-stack--minimal">
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
		<span className="campfire-submission-meta-inline">
			<span>{props.label}</span>
			<strong title={props.value}>{props.value}</strong>
		</span>
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
	const label = props.question?.label ?? 'Unknown question';
	const value = props.value.trim() === '' ? '—' : props.value;

	return (
		<div className={props.highlight ? 'campfire-answer-row campfire-answer-row--attention' : 'campfire-answer-row'}>
			<div className="campfire-answer-row-header">
				<CampfireBidiText title={label}>{label}</CampfireBidiText>

				{props.question?.isPrivate === true && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
				{props.highlight && <CampfireStatusPill tone="red">Needs attention</CampfireStatusPill>}
			</div>

			<CampfireBidiText className="campfire-answer-value" title={value}>{value}</CampfireBidiText>
		</div>
	);
}
