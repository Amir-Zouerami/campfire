import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { QuestionType, StandupQuestion } from '@/shared/types/domain';
import { Grid, Modal, Stack } from '@/shared/ui';

import { nextPosition, parseOptions, QUESTION_TYPES, questionRequest, questionValuesOf, typeNeedsOptions } from './standupForms';
import type { QuestionValues } from './standupForms';
import { useStandupMutations } from './useStandupMutations';

const schema = z
	.object({
		section: z.string(),
		label: z.string().check(z.trim(), z.minLength(1, msg('settings.standups.validation.questionLabelRequired'))),
		helpText: z.string(),
		placeholder: z.string(),
		type: z.enum(QUESTION_TYPES as [QuestionType, ...QuestionType[]]),
		required: z.boolean(),
		showInReport: z.boolean(),
		isPrivate: z.boolean(),
		createsTasks: z.boolean(),
		position: z.number(),
		optionsText: z.string(),
	})
	.check(
		z.superRefine((value, context) => {
			if (typeNeedsOptions(value.type) && parseOptions(value.optionsText).length === 0) {
				context.addIssue({ code: 'custom', path: ['optionsText'], message: msg('settings.standups.validation.questionOptionsRequired') });
			}
		}),
	);

type QuestionDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
	readonly templateID: string;
	/** All questions of the workspace, used to place a new question last. */
	readonly questions: readonly StandupQuestion[];
	/** The question being edited, or null to add a new one. */
	readonly question: StandupQuestion | null;
};

/**
 * QuestionDialog adds or edits one question of a template. Mount it with a `key` per
 * question so the form starts from that question's values.
 */
export function QuestionDialog(props: QuestionDialogProps): ReactElement {
	const { t } = useI18n();
	const { createQuestion, updateQuestion } = useStandupMutations();
	const editing = props.question;

	const defaults: QuestionValues =
		editing === null
			? {
					section: '',
					label: '',
					helpText: '',
					placeholder: '',
					type: 'long_text',
					required: true,
					showInReport: true,
					isPrivate: false,
					createsTasks: false,
					position: nextPosition(props.questions, props.templateID),
					optionsText: '',
				}
			: questionValuesOf(editing);

	const form = useAppForm({
		defaultValues: defaults,
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			const request = questionRequest(props.templateID, value);
			if (editing === null) {
				await createQuestion.mutateAsync(request);
			} else {
				await updateQuestion.mutateAsync({ id: editing.id, request });
			}

			props.onClose();
		},
	});

	return (
		<Modal
			open={props.open}
			size="md"
			title={editing === null ? t('settings.standups.actions.addQuestion') : t('settings.standups.question.eyebrow')}
			description={t('settings.standups.question.description')}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton label={t('settings.standups.actions.saveQuestion')} />
				</form.AppForm>
			}
		>
			<Stack gap={4}>
				<form.AppField name="label">
					{field => (
						<field.TextField
							required
							userContent
							label={t('settings.standups.fields.questionLabel')}
							placeholder={t('settings.standups.fields.questionLabel.placeholder')}
						/>
					)}
				</form.AppField>
				<Grid columns={2}>
					<form.AppField name="type">
						{field => (
							<field.SelectField
								label={t('settings.standups.fields.type')}
								options={QUESTION_TYPES.map(type => ({ value: type, label: t(`settings.standups.questionType.${type}`) }))}
							/>
						)}
					</form.AppField>
					<form.AppField name="section">
						{field => <field.TextField userContent label={t('settings.standups.fields.section')} />}
					</form.AppField>
				</Grid>
				<form.Subscribe selector={state => state.values.type}>
					{type =>
						typeNeedsOptions(type) ? (
							<form.AppField name="optionsText">
								{field => (
									<field.TextAreaField
										required
										userContent
										rows={4}
										label={t('settings.standups.fields.options')}
										description={t('settings.standups.fields.options.description')}
										placeholder={t('settings.standups.fields.options.placeholder')}
									/>
								)}
							</form.AppField>
						) : null
					}
				</form.Subscribe>
				<form.AppField name="helpText">
					{field => (
						<field.TextField
							userContent
							label={t('settings.standups.fields.helpText')}
							placeholder={t('settings.standups.fields.helpText.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="placeholder">
					{field => (
						<field.TextField
							userContent
							label={t('settings.standups.fields.placeholder')}
							placeholder={t('settings.standups.fields.placeholder.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="position">{field => <field.NumberField label={t('settings.standups.fields.position')} />}</form.AppField>
				<Stack gap={0}>
					<form.AppField name="required">
						{field => (
							<field.SwitchField
								label={t('settings.standups.fields.required')}
								description={t('settings.standups.fields.required.description')}
							/>
						)}
					</form.AppField>
					<form.AppField name="showInReport">
						{field => (
							<field.SwitchField
								label={t('settings.standups.fields.showInReport')}
								description={t('settings.standups.fields.showInReport.description')}
							/>
						)}
					</form.AppField>
					<form.AppField name="isPrivate">
						{field => (
							<field.SwitchField
								label={t('settings.standups.fields.private')}
								description={t('settings.standups.fields.private.description')}
							/>
						)}
					</form.AppField>
					<form.Subscribe selector={state => state.values.type}>
						{type =>
							type === 'work_items' ? (
								<form.AppField name="createsTasks">
									{field => (
										<field.SwitchField
											label={t('settings.standups.fields.createTasks')}
											description={t('settings.standups.fields.createTasks.description')}
										/>
									)}
								</form.AppField>
							) : null
						}
					</form.Subscribe>
				</Stack>
			</Stack>
		</Modal>
	);
}
