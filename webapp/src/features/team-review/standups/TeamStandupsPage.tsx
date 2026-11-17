import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useStandupConfiguration } from '@/shared/data/standups';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { useToday } from '@/shared/session';
import { UserLabel, useUserDirectory } from '@/shared/users';
import {
	Container,
	DateField,
	EmptyState,
	Field,
	Grid,
	Inline,
	ListRow,
	ListRows,
	LoadingState,
	PageHeader,
	QueryView,
	Section,
	Select,
	Stack,
	Stat,
	Tag,
	Text,
} from '@/shared/ui';
import type { StandupOccurrenceSummary, StandupQuestion, StandupSubmissionSortMode } from '@/shared/types/domain';

import { answerNeedsAttention, answerText } from './answers';
import { useTeamStandups } from './useTeamStandups';

const SORT_OPTIONS: readonly { readonly value: StandupSubmissionSortMode; readonly label: TranslationKey }[] = [
	{ value: 'first_submitted', label: 'teamReview.standups.sort.firstSubmitted.label' },
	{ value: 'last_submitted', label: 'teamReview.standups.sort.lastSubmitted.label' },
	{ value: 'name', label: 'teamReview.standups.sort.name.label' },
	{ value: 'missing_first', label: 'teamReview.standups.sort.missingFirst.label' },
];

/**
 * TeamStandupsPage lets a lead review one day's standups: who is missing or away, and what everyone said.
 */
export function TeamStandupsPage(): ReactElement {
	const { t } = useI18n();
	const today = useToday();
	const [date, setDate] = useState(today);
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>('first_submitted');
	const standups = useTeamStandups(date, sortMode);
	const configuration = useStandupConfiguration();

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.teamReview.label')}
				title={t('teamReview.sections.standups.label')}
				description={t('teamReview.sections.standups.description')}
			/>

			<Grid columns={2}>
				<Field label={t('teamReview.standups.controls.date.label')}>
					<DateField value={date} onChange={setDate} />
				</Field>
				<Field label={t('teamReview.standups.controls.sort.label')}>
					<Select
						value={sortMode}
						onChange={value => setSortMode(value as StandupSubmissionSortMode)}
						options={SORT_OPTIONS.map(option => ({ value: option.value, label: t(option.label) }))}
					/>
				</Field>
			</Grid>

			{standups.isPending ? (
				<LoadingState title={t('teamReview.standups.loading')} />
			) : (
				<QueryView query={standups} errorTitle={t('teamReview.standups.error.fallback')}>
					{summary => (
						<>
							<SummaryFigures summary={summary} />
							<Section divided>
								<Grid columns={3} gap={8}>
									<PeopleGroup
										title={t('teamReview.standups.people.missing.title')}
										description={t('teamReview.standups.people.missing.description')}
										emptyTitle={t('teamReview.standups.people.missing.empty.title')}
										userIDs={summary.missingUserIds}
										status={t('teamReview.standups.people.missing.status')}
									/>
									<PeopleGroup
										title={t('teamReview.standups.people.onLeave.title')}
										description={t('teamReview.standups.people.onLeave.description')}
										emptyTitle={t('teamReview.standups.people.onLeave.empty.title')}
										userIDs={summary.onLeaveUserIds}
										status={t('teamReview.standups.people.onLeave.status')}
									/>
									<PeopleGroup
										title={t('teamReview.standups.people.excluded.title')}
										description={t('teamReview.standups.people.excluded.description')}
										emptyTitle={t('teamReview.standups.people.excluded.empty.title')}
										userIDs={summary.excludedUserIds}
										status={t('teamReview.standups.people.excluded.status')}
									/>
								</Grid>
							</Section>
							<Section
								divided
								title={t('teamReview.standups.submissions.title')}
								description={t('teamReview.standups.submissions.description')}
							>
								<Submissions summary={summary} questions={configuration.data?.questions ?? []} />
							</Section>
						</>
					)}
				</QueryView>
			)}
		</Container>
	);
}

/**
 * SummaryFigures are the headline numbers for the selected date.
 */
function SummaryFigures(props: { readonly summary: StandupOccurrenceSummary }): ReactElement {
	const { t } = useI18n();
	const { summary } = props;
	const percent =
		summary.memberUserIds.length === 0 ? 0 : Math.round((summary.submittedUserIds.length / summary.memberUserIds.length) * 100);

	return (
		<Inline gap={10} wrap>
			<Stat label={t('teamReview.standups.summary.participants')} value={summary.memberUserIds.length} />
			<Stat label={t('teamReview.standups.summary.submitted')} value={summary.submittedUserIds.length} />
			<Stat
				label={t('teamReview.standups.summary.missing')}
				value={summary.missingUserIds.length}
				emphasis={summary.missingUserIds.length > 0}
			/>
			<Stat label={t('teamReview.standups.summary.onLeave')} value={summary.onLeaveUserIds.length} />
			<Stat label={t('teamReview.standups.summary.excluded')} value={summary.excludedUserIds.length} />
			<Stat label={t('teamReview.standups.summary.complete')} value={`${percent}%`} />
		</Inline>
	);
}

type PeopleGroupProps = {
	readonly title: string;
	readonly description: string;
	readonly emptyTitle: string;
	readonly userIDs: readonly string[];
	readonly status: string;
};

/**
 * PeopleGroup lists people sharing one status (missing, on leave, excluded).
 */
function PeopleGroup(props: PeopleGroupProps): ReactElement {
	return (
		<Stack gap={3}>
			<Stack gap={1}>
				<Text weight="bold">{props.title}</Text>
				<Text size="sm" tone="muted">
					{props.description}
				</Text>
			</Stack>
			{props.userIDs.length === 0 ? (
				<Text tone="muted">{props.emptyTitle}</Text>
			) : (
				<ListRows label={props.title}>
					{props.userIDs.map(userID => (
						<ListRow key={userID} title={<UserLabel userID={userID} />} trailing={<Tag>{props.status}</Tag>} />
					))}
				</ListRows>
			)}
		</Stack>
	);
}

type SubmissionsProps = {
	readonly summary: StandupOccurrenceSummary;
	readonly questions: readonly StandupQuestion[];
};

/**
 * Submissions shows each person's answers, marking blockers and private answers.
 */
function Submissions(props: SubmissionsProps): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const questionByID = new Map(props.questions.map(question => [question.id, question]));
	const directory = useUserDirectory(props.summary.submissions.map(row => row.submission.userId));

	if (props.summary.submissions.length === 0) {
		return (
			<EmptyState
				icon={ClipboardList}
				title={t('teamReview.standups.submissions.empty.title')}
				description={t('teamReview.standups.submissions.empty.description')}
			/>
		);
	}

	return (
		<ListRows label={t('teamReview.standups.submissions.title')}>
			{props.summary.submissions.map(row => (
				<ListRow
					key={row.submission.id}
					title={
						<UserLabel
							userID={row.submission.userId}
							subtitle={
								directory.profileOf(row.submission.userId)?.username === undefined
									? undefined
									: `@${directory.profileOf(row.submission.userId)?.username}`
							}
						/>
					}
					subtitle={`${t('teamReview.standups.submissions.firstSubmitted')} ${formatTimestamp(row.submission.firstSubmittedAt)} · ${t('teamReview.standups.submissions.lastUpdated')} ${formatTimestamp(row.submission.lastUpdatedAt)}`}
					detail={
						<Stack gap={3}>
							{row.answers.map(answer => {
								const question = questionByID.get(answer.questionId);
								const attention = answerNeedsAttention(answer, question);

								return (
									<Stack key={answer.id} gap={1}>
										<Inline gap={2}>
											<Text size="sm" weight="bold" tone="muted" userContent>
												{question?.label ?? t('teamReview.standups.submissions.unknownQuestion')}
											</Text>
											{question?.isPrivate === true && <Tag>{t('teamReview.standups.submissions.private')}</Tag>}
											{attention && <Tag tone="flame">{t('teamReview.standups.submissions.needsAttention')}</Tag>}
										</Inline>
										<Text userContent preserveLines>
											{answerText(answer.valueJson, t('common.yes'), t('common.no'))}
										</Text>
									</Stack>
								);
							})}
						</Stack>
					}
					trailing={<Tag tone="teal">{t('teamReview.standups.submissions.status.submitted')}</Tag>}
				/>
			))}
		</ListRows>
	);
}
