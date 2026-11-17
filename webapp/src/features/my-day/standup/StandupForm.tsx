import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import type { ReactElement } from 'react';

import { submitStandup } from '@/shared/api';
import { standupKeys } from '@/shared/data/standups';
import { submitForm, useAppForm } from '@/shared/forms';
import { isolateBidi, useI18n } from '@/shared/i18n';
import { useWorkspaceID } from '@/shared/session';
import { Stack, toast } from '@/shared/ui';
import type { StandupQuestion, StandupSchedule, StandupTemplate } from '@/shared/types/domain';

import { taskKeys } from '../tasks/tasks';
import type { TaskIndex } from '../tasks/tasks';
import { answerFieldName, serializeAnswer, validateAnswers } from './answers';
import type { AnswerMap } from './answers';
import { StandupQuestionControl } from './StandupQuestionControl';

type StandupFormProps = {
	readonly template: StandupTemplate;
	readonly schedule: StandupSchedule;
	readonly questions: readonly StandupQuestion[];
	readonly date: string;
	readonly initialAnswers: AnswerMap;
	readonly tasks: TaskIndex;
};

/**
 * StandupForm is the answer form for one template on one date. It is keyed by its inputs, so
 * choosing another date or schedule starts a fresh form instead of mutating a stale one.
 */
export function StandupForm(props: StandupFormProps): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();

	const submit = useMutation({
		mutationFn: submitStandup,
		onSuccess: response => {
			const updated = isolateBidi(formatTimestamp(response.submission.lastUpdatedAt));
			const created = response.createdTasks.length;

			toast.success(
				created > 0
					? t('myDay.standup.saved.successWithTasks', {
							taskCount: created,
							taskLabel: created === 1 ? t('myDay.standup.saved.task.singular') : t('myDay.standup.saved.task.plural'),
							time: updated,
						})
					: t('myDay.standup.saved.success', { time: updated }),
			);

			return Promise.all([
				queryClient.invalidateQueries({ queryKey: standupKeys.all(workspaceID) }),
				queryClient.invalidateQueries({ queryKey: taskKeys.all(workspaceID) }),
			]);
		},
	});

	const form = useAppForm({
		defaultValues: { answers: props.initialAnswers },
		validators: {
			onSubmit: ({ value }) => {
				const fields = validateAnswers(props.questions, value.answers, t);

				return Object.keys(fields).length === 0 ? undefined : { fields };
			},
		},
		onSubmit: async ({ value }) => {
			await submit.mutateAsync({
				workspaceId: workspaceID,
				templateId: props.template.id,
				scheduleId: props.schedule.id,
				occurrenceDate: props.date,
				answers: props.questions.map(question => ({
					questionId: question.id,
					valueJson: serializeAnswer(question, value.answers[question.id]),
				})),
			});
		},
	});

	return (
		<form
			noValidate
			onSubmit={event => {
				event.preventDefault();
				submitForm(form);
			}}
		>
			<Stack gap={8}>
				{props.questions.map(question => (
					<form.AppField key={question.id} name={answerFieldName(question.id)}>
						{() => <StandupQuestionControl question={question} tasks={props.tasks} disabled={false} />}
					</form.AppField>
				))}
				<form.AppForm>
					<form.SubmitButton icon={Send} label={t('myDay.standup.submit.idle')} />
				</form.AppForm>
			</Stack>
		</form>
	);
}
