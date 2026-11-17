import { useQuery } from '@tanstack/react-query';
import { CalendarX2, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { evaluateStandupDay, getMyStandupSubmission } from '@/shared/api';
import { scheduleKindLabel, standupKeys, useStandupConfiguration } from '@/shared/data/standups';
import { isolateBidi, useI18n } from '@/shared/i18n';
import { useToday, useWorkspaceSession } from '@/shared/session';
import { DateField, EmptyState, Field, LoadingState, Notice, PageHeader, QueryView, Select, Stack, Grid, Container } from '@/shared/ui';

import { buildTaskIndex, useMyTasks } from '../tasks/tasks';
import { answersFromStored, emptyAnswers, questionsOfTemplate } from './answers';
import { availableSchedules, blockedReason } from './schedules';
import { StandupForm } from './StandupForm';

/**
 * StandupPage is where a member answers the day's standup, or corrects an earlier one.
 */
export function StandupPage(): ReactElement {
	const { t } = useI18n();
	const { capabilities } = useWorkspaceSession();

	if (!capabilities.canSubmitStandup) {
		return (
			<Container>
				<PageHeader
					eyebrow={t('myDay.standup.excluded.eyebrow')}
					title={t('myDay.standup.excluded.title')}
					description={t('myDay.standup.excluded.description')}
				/>
				<EmptyState
					icon={CalendarX2}
					title={t('myDay.standup.excluded.empty.title')}
					description={t('myDay.standup.excluded.empty.description')}
				/>
			</Container>
		);
	}

	return <StandupWorkflow />;
}

function StandupWorkflow(): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const { workspace, user } = useWorkspaceSession();
	const today = useToday();
	const configuration = useStandupConfiguration();
	const tasks = useMyTasks(true);

	return (
		<Container>
			<PageHeader
				eyebrow={t('myDay.standup.page.eyebrow')}
				title={t('myDay.standup.page.title')}
				description={t('myDay.standup.page.description')}
			/>
			<QueryView
				query={configuration}
				loadingTitle={t('myDay.standup.loading.form')}
				isEmpty={data => data.schedules.length === 0}
				empty={{ title: t('myDay.standup.schedule.empty.title'), description: t('myDay.standup.schedule.empty.description') }}
			>
				{data => (
					<StandupFiller
						key={workspace.id}
						configuration={data}
						today={today}
						userID={user.id}
						taskIndex={buildTaskIndex(tasks.data ?? [])}
						formatUpdated={value => isolateBidi(formatTimestamp(value))}
					/>
				)}
			</QueryView>
		</Container>
	);
}

type StandupFillerProps = {
	readonly configuration: NonNullable<ReturnType<typeof useStandupConfiguration>['data']>;
	readonly today: string;
	readonly userID: string;
	readonly taskIndex: ReturnType<typeof buildTaskIndex>;
	readonly formatUpdated: (value: string) => string;
};

/**
 * StandupFiller chooses the date and schedule, then shows the form for that choice.
 */
function StandupFiller(props: StandupFillerProps): ReactElement {
	const { t } = useI18n();
	const { workspace } = useWorkspaceSession();
	const [date, setDate] = useState(props.today);
	const [chosenScheduleID, setChosenScheduleID] = useState('');

	const decision = useQuery({
		queryKey: standupKeys.runtime(workspace.id, date),
		queryFn: async () => (await evaluateStandupDay(workspace.id, date)).decision,
		enabled: date !== '',
	});

	const { templates, questions, schedules } = props.configuration;
	const available = availableSchedules(schedules, templates, decision.data);
	const schedule = available.find(candidate => candidate.id === chosenScheduleID) ?? available[0] ?? null;
	const template = schedule === null ? null : (templates.find(candidate => candidate.id === schedule.templateId) ?? null);
	const blocked = blockedReason({ date, today: props.today, decision: decision.data, schedules: available, userID: props.userID }, t);

	const stored = useQuery({
		queryKey: standupKeys.mine(workspace.id, date, template?.id, schedule?.id),
		queryFn: () =>
			getMyStandupSubmission({ workspaceId: workspace.id, occurrenceDate: date, templateId: template?.id, scheduleId: schedule?.id }),
		enabled: schedule !== null && template !== null && blocked === null && date <= props.today,
	});

	const templateQuestions = template === null ? [] : questionsOfTemplate(questions, template.id);
	const savedSubmission = stored.data?.submission ?? null;

	return (
		<Stack gap={6}>
			<Grid columns={2}>
				<Field label={t('myDay.standup.controls.schedule.label')}>
					<Select
						value={schedule?.id ?? ''}
						onChange={setChosenScheduleID}
						disabled={available.length === 0}
						options={
							available.length === 0
								? [{ value: '', label: t('myDay.standup.controls.schedule.empty') }]
								: available.map(candidate => ({
										value: candidate.id,
										label: `${templates.find(item => item.id === candidate.templateId)?.name ?? t('myDay.standup.template.unknown')} · ${scheduleKindLabel(t, candidate.kind)}`,
									}))
						}
					/>
				</Field>
				<Field label={t('myDay.standup.controls.date.label')}>
					<DateField value={date} onChange={setDate} max={props.today} />
				</Field>
			</Grid>

			{savedSubmission !== null && (
				<Notice>
					{t('myDay.standup.saved.editing', { date: isolateBidi(date), time: props.formatUpdated(savedSubmission.lastUpdatedAt) })}
				</Notice>
			)}

			{blocked !== null ? (
				<EmptyState
					icon={CalendarX2}
					title={blocked.onLeave ? t('myDay.standup.form.blocked.onLeaveTitle') : t('myDay.standup.form.blocked.title')}
					description={blocked.message}
				/>
			) : schedule === null || template === null || decision.isPending || stored.isPending ? (
				<LoadingState title={t('myDay.standup.loading.form')} />
			) : templateQuestions.length === 0 ? (
				<EmptyState
					icon={ClipboardList}
					title={t('myDay.standup.schedule.empty.title')}
					description={t('myDay.standup.schedule.empty.description')}
				/>
			) : (
				<StandupForm
					key={`${date}|${schedule.id}|${savedSubmission?.lastUpdatedAt ?? 'new'}`}
					template={template}
					schedule={schedule}
					questions={templateQuestions}
					date={date}
					tasks={props.taskIndex}
					initialAnswers={
						stored.data !== undefined && savedSubmission !== null
							? answersFromStored(templateQuestions, stored.data.answers)
							: emptyAnswers(templateQuestions)
					}
				/>
			)}
		</Stack>
	);
}
