import type { ReactElement } from 'react';
import { MessageSquareText } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
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
	const { t } = useI18n();

	return (
		<div className="campfire-submission-stage campfire-submission-stage--flat">
			{props.submissions.length === 0 ? (
				<CampfireEmpty
					className="campfire-submission-empty"
					icon={MessageSquareText}
					title={t('teamReview.standups.submissions.empty.title')}
					description={t('teamReview.standups.submissions.empty.description')}
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
	const { htmlLang, t } = useI18n();
	const submission = props.item.submission;
	const userLabel = props.labelForUserID(submission.userId);

	return (
		<article className="campfire-submission-card campfire-submission-card--minimal">
			<header className="campfire-submission-card-header">
				<div className="campfire-submission-user-copy">
					<CampfireBidiText title={userLabel}>{userLabel}</CampfireBidiText>
					<span>{submission.occurrenceDate}</span>
				</div>

				<CampfireStatusPill tone="green">{t('teamReview.standups.submissions.status.submitted')}</CampfireStatusPill>
			</header>

			<div className="campfire-submission-meta-row">
				<SubmissionMeta label={t('teamReview.standups.submissions.firstSubmitted')} value={formatDateTime(submission.firstSubmittedAt, htmlLang)} />
				<SubmissionMeta label={t('teamReview.standups.submissions.lastUpdated')} value={formatDateTime(submission.lastUpdatedAt, htmlLang)} />
			</div>

			<div className="campfire-answer-stack campfire-answer-stack--minimal">
				{props.item.answers.map(answer => {
					const question = props.questionsByID[answer.questionId];

					return (
						<AnswerRow
							key={answer.id}
							question={question}
							value={formatAnswerValue(answer.valueJson, t('common.yes'), t('common.no'))}
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
	const { t } = useI18n();
	const label = props.question?.label ?? t('teamReview.standups.submissions.unknownQuestion');
	const value = props.value.trim() === '' ? '—' : props.value;

	return (
		<div className={props.highlight ? 'campfire-answer-row campfire-answer-row--attention' : 'campfire-answer-row'}>
			<div className="campfire-answer-row-header">
				<CampfireBidiText title={label}>{label}</CampfireBidiText>

				{props.question?.isPrivate === true && <CampfireStatusPill tone="slate">{t('teamReview.standups.submissions.private')}</CampfireStatusPill>}
				{props.highlight && <CampfireStatusPill tone="red">{t('teamReview.standups.submissions.needsAttention')}</CampfireStatusPill>}
			</div>

			<CampfireBidiText className="campfire-answer-value" title={value}>{value}</CampfireBidiText>
		</div>
	);
}
