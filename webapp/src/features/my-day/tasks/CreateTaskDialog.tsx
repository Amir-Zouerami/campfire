import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Modal, Stack, toast } from '@/shared/ui';

import { useTaskMutations } from './tasks';

const schema = z.object({
	title: z.string().check(z.trim(), z.minLength(1, msg('myDay.time.validation.taskTitleRequired'))),
	description: z.string(),
	boardUrl: z.string(),
});

type CreateTaskDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
};

/**
 * CreateTaskDialog adds one personal task.
 */
export function CreateTaskDialog(props: CreateTaskDialogProps): ReactElement {
	const { t } = useI18n();
	const { create } = useTaskMutations();

	const form = useAppForm({
		defaultValues: { title: '', description: '', boardUrl: '' },
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value, formApi }) => {
			await create.mutateAsync({
				title: value.title.trim(),
				description: value.description.trim(),
				boardUrl: value.boardUrl.trim(),
				projectId: '',
				categoryId: '',
			});
			toast.success(t('myDay.time.toast.taskCreated'));
			formApi.reset();
			props.onClose();
		},
	});

	return (
		<Modal
			open={props.open}
			size="md"
			title={t('myDay.tasks.create.title')}
			description={t('myDay.tasks.create.description')}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton label={t('myDay.tasks.create.submit')} />
				</form.AppForm>
			}
		>
			<Stack gap={4}>
				<form.AppField name="title">
					{field => (
						<field.TextField
							required
							userContent
							label={t('myDay.tasks.field.title')}
							placeholder={t('myDay.tasks.field.title.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="description">
					{field => (
						<field.TextAreaField
							userContent
							label={t('myDay.tasks.field.description')}
							placeholder={t('myDay.tasks.field.description.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="boardUrl">
					{field => <field.TextField ltr label={t('myDay.tasks.field.boardUrl')} placeholder="https://…" />}
				</form.AppField>
			</Stack>
		</Modal>
	);
}
