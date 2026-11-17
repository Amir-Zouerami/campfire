import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { StandupKind, StandupTemplate } from '@/shared/types/domain';
import { Modal, Notice, Stack } from '@/shared/ui';

import { isDuplicateName, normalizeName, STANDUP_KINDS } from './standupForms';
import { useStandupMutations } from './useStandupMutations';

type TemplateDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
	/** Every template in the workspace, to reject duplicate names. */
	readonly templates: readonly StandupTemplate[];
	/** Called with the new template's id so the page can open it. */
	readonly onCreated: (templateID: string) => void;
};

/**
 * TemplateDialog creates a standup template: a name and a cadence. Questions and schedules
 * are added after it exists.
 */
export function TemplateDialog(props: TemplateDialogProps): ReactElement {
	const { t } = useI18n();
	const { createTemplate } = useStandupMutations();

	const schema = z.object({
		name: z.string().check(
			z.refine(value => normalizeName(value) !== '', msg('settings.standups.validation.templateNameRequired')),
			z.refine(value => !isDuplicateName(props.templates, value), msg('settings.standups.validation.templateNameDuplicate')),
		),
		description: z.string(),
		kind: z.enum(['daily', 'weekly', 'custom']),
	});

	const form = useAppForm({
		defaultValues: { name: '', description: '', kind: 'daily' as StandupKind },
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value, formApi }) => {
			const response = await createTemplate.mutateAsync({
				name: normalizeName(value.name),
				description: value.description.trim(),
				kind: value.kind,
				isActive: true,
			});
			formApi.reset();
			props.onClose();
			props.onCreated(response.template.id);
		},
	});

	return (
		<Modal
			open={props.open}
			size="md"
			title={t('settings.standups.forms.new.title')}
			description={t('settings.standups.forms.new.description')}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton label={t('settings.standups.actions.createTemplate')} />
				</form.AppForm>
			}
		>
			<Stack gap={4}>
				<form.AppField name="name">
					{field => (
						<field.TextField
							required
							userContent
							label={t('settings.standups.fields.templateName')}
							placeholder={t('settings.standups.fields.templateName.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="kind">
					{field => (
						<field.SelectField
							label={t('settings.standups.fields.kind')}
							options={STANDUP_KINDS.map(kind => ({ value: kind, label: t(`settings.standups.kind.${kind}`) }))}
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={state => state.values.kind === 'daily'}>
					{daily => (daily ? <Notice tone="info">{t('settings.standups.fields.templateActive.dailyNotice')}</Notice> : null)}
				</form.Subscribe>
				<form.AppField name="description">
					{field => (
						<field.TextAreaField
							userContent
							label={t('settings.standups.fields.description')}
							placeholder={t('settings.standups.fields.description.placeholder')}
						/>
					)}
				</form.AppField>
			</Stack>
		</Modal>
	);
}
