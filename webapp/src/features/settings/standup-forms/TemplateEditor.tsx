import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { scheduleKindLabel } from '@/shared/data/standups';
import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { StandupKind, StandupQuestion, StandupSchedule, StandupTemplate } from '@/shared/types/domain';
import {
	Button,
	ConfirmDialog,
	EmptyState,
	IconButton,
	Inline,
	ListRow,
	ListRows,
	Notice,
	Section,
	Stack,
	StatusText,
	Tag,
	Text,
} from '@/shared/ui';

import { QuestionDialog } from './QuestionDialog';
import { ScheduleDialog } from './ScheduleDialog';
import { isDuplicateName, normalizeName, sortQuestions, sortSchedules, STANDUP_KINDS } from './standupForms';
import { useStandupMutations } from './useStandupMutations';

type TemplateEditorProps = {
	readonly template: StandupTemplate;
	readonly templates: readonly StandupTemplate[];
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
	readonly onDeleted: () => void;
};

/** A dialog that is closed (null), adding a new item (item null) or editing one. */
type Editing<Item> = { readonly item: Item | null } | null;

type Deleting =
	{ readonly kind: 'template' } | { readonly kind: 'question'; readonly id: string } | { readonly kind: 'schedule'; readonly id: string };

/**
 * TemplateEditor edits one template: its identity, its questions and its schedules.
 * Mount it with a `key` including the template's update time so saved changes reset the form.
 */
export function TemplateEditor(props: TemplateEditorProps): ReactElement {
	const { t } = useI18n();
	const { template } = props;
	const { updateTemplate, deleteTemplate, deleteQuestion, deleteSchedule } = useStandupMutations();
	const [question, setQuestion] = useState<Editing<StandupQuestion>>(null);
	const [schedule, setSchedule] = useState<Editing<StandupSchedule>>(null);
	const [deleting, setDeleting] = useState<Deleting | null>(null);

	const questions = sortQuestions(props.questions.filter(item => item.templateId === template.id));
	const schedules = sortSchedules(props.schedules.filter(item => item.templateId === template.id));

	const schema = z.object({
		name: z.string().check(
			z.refine(value => normalizeName(value) !== '', msg('settings.standups.validation.templateNameRequired')),
			z.refine(value => !isDuplicateName(props.templates, value, template.id), msg('settings.standups.validation.templateNameDuplicate')),
		),
		description: z.string(),
		kind: z.enum(['daily', 'weekly', 'custom']),
		isActive: z.boolean(),
	});

	const form = useAppForm({
		defaultValues: {
			name: template.name,
			description: template.description,
			kind: template.kind as StandupKind,
			isActive: template.isActive,
		},
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			await updateTemplate.mutateAsync({
				id: template.id,
				request: { name: normalizeName(value.name), description: value.description.trim(), kind: value.kind, isActive: value.isActive },
			});
		},
	});

	async function confirmDelete(): Promise<void> {
		if (deleting === null) {
			return;
		}

		if (deleting.kind === 'template') {
			await deleteTemplate.mutateAsync(template.id);
			props.onDeleted();
		} else if (deleting.kind === 'question') {
			await deleteQuestion.mutateAsync(deleting.id);
		} else {
			await deleteSchedule.mutateAsync(deleting.id);
		}

		setDeleting(null);
	}

	const deletingBusy = deleteTemplate.isPending || deleteQuestion.isPending || deleteSchedule.isPending;

	return (
		<Stack gap={10}>
			<Section
				eyebrow={t('settings.standups.template.eyebrow')}
				title={template.name}
				description={t('settings.standups.template.description')}
				actions={
					<Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleting({ kind: 'template' })}>
						{t('settings.standups.actions.deleteTemplate')}
					</Button>
				}
			>
				<form
					noValidate
					onSubmit={event => {
						event.preventDefault();
						submitForm(form);
					}}
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
						<form.AppField name="description">
							{field => (
								<field.TextAreaField
									userContent
									label={t('settings.standups.fields.description')}
									placeholder={t('settings.standups.fields.description.placeholder')}
								/>
							)}
						</form.AppField>
						<form.AppField name="isActive">
							{field => (
								<field.SwitchField
									label={t('settings.standups.fields.templateActive')}
									description={t('settings.standups.fields.templateActive.description')}
								/>
							)}
						</form.AppField>
						<form.Subscribe selector={state => state.values.kind === 'daily' && state.values.isActive}>
							{daily => (daily ? <Notice tone="info">{t('settings.standups.fields.templateActive.dailyNotice')}</Notice> : null)}
						</form.Subscribe>
						<div>
							<form.AppForm>
								<form.SubmitButton label={t('settings.standups.actions.saveTemplate')} />
							</form.AppForm>
						</div>
					</Stack>
				</form>
			</Section>

			<Section
				divided
				eyebrow={t('settings.standups.questions.eyebrow')}
				title={t('settings.standups.questions.title')}
				description={t('settings.standups.questions.description')}
				actions={
					<Button size="sm" icon={Plus} onClick={() => setQuestion({ item: null })}>
						{t('settings.standups.actions.addQuestion')}
					</Button>
				}
			>
				{questions.length === 0 ? (
					<EmptyState
						title={t('settings.standups.questions.empty.title')}
						description={t('settings.standups.questions.empty.description')}
					/>
				) : (
					<ListRows label={t('settings.standups.questions.title')}>
						{questions.map(item => (
							<ListRow
								key={item.id}
								title={<span dir="auto">{item.label}</span>}
								subtitle={`${t(`settings.standups.questionType.${item.type}`)} · ${t('settings.standups.meta.position', { position: item.position })}${item.section === '' ? '' : ` · ${item.section}`}`}
								trailing={
									<>
										<Inline gap={1} wrap>
											{item.required && <Tag>{t('settings.standups.badge.required')}</Tag>}
											{item.showInReport && <Tag tone="teal">{t('settings.standups.badge.report')}</Tag>}
											{item.createsTasks && <Tag tone="violet">{t('settings.standups.badge.tasks')}</Tag>}
										</Inline>
										<IconButton icon={Pencil} variant="ghost" label={t('common.edit')} onClick={() => setQuestion({ item })} />
										<IconButton
											icon={Trash2}
											variant="ghost"
											label={t('settings.standups.actions.deleteQuestion')}
											onClick={() => setDeleting({ kind: 'question', id: item.id })}
										/>
									</>
								}
							/>
						))}
					</ListRows>
				)}
			</Section>

			<Section
				divided
				eyebrow={t('settings.standups.schedules.library.eyebrow')}
				title={t('settings.standups.schedules.library.title')}
				description={t('settings.standups.schedules.library.description')}
				actions={
					<Button size="sm" icon={Plus} onClick={() => setSchedule({ item: null })}>
						{t('settings.standups.actions.newSchedule')}
					</Button>
				}
			>
				{schedules.length === 0 ? (
					<EmptyState
						title={t('settings.standups.schedules.empty.title')}
						description={t('settings.standups.schedules.empty.description')}
					/>
				) : (
					<ListRows label={t('settings.standups.schedules.library.title')}>
						{schedules.map(item => (
							<ListRow
								key={item.id}
								title={t('settings.standups.schedule.kindLabel', { kind: scheduleKindLabel(t, item.kind) })}
								subtitle={<Text size="sm" tone="muted" numeric>{`${item.opensAt} → ${item.timeOfDay}`}</Text>}
								trailing={
									<>
										<StatusText kind={item.enabled ? 'approved' : 'inactive'}>
											{t(item.enabled ? 'settings.standups.status.enabled' : 'settings.standups.status.disabled')}
										</StatusText>
										<IconButton icon={Pencil} variant="ghost" label={t('common.edit')} onClick={() => setSchedule({ item })} />
										<IconButton
											icon={Trash2}
											variant="ghost"
											label={t('settings.standups.actions.deleteSchedule')}
											onClick={() => setDeleting({ kind: 'schedule', id: item.id })}
										/>
									</>
								}
							/>
						))}
					</ListRows>
				)}
			</Section>

			<QuestionDialog
				key={question?.item?.id ?? 'new-question'}
				open={question !== null}
				onClose={() => setQuestion(null)}
				templateID={template.id}
				questions={props.questions}
				question={question?.item ?? null}
			/>
			<ScheduleDialog
				key={schedule?.item?.id ?? 'new-schedule'}
				open={schedule !== null}
				onClose={() => setSchedule(null)}
				templateID={template.id}
				schedule={schedule?.item ?? null}
			/>

			<ConfirmDialog
				open={deleting !== null}
				tone="danger"
				title={t(
					deleting?.kind === 'question'
						? 'settings.standups.delete.question.title'
						: deleting?.kind === 'schedule'
							? 'settings.standups.delete.schedule.title'
							: 'settings.standups.delete.template.title',
				)}
				description={t(
					deleting?.kind === 'question'
						? 'settings.standups.delete.question.descriptionLong'
						: deleting?.kind === 'schedule'
							? 'settings.standups.delete.schedule.description'
							: 'settings.standups.delete.template.description',
				)}
				confirmLabel={t(
					deleting?.kind === 'question'
						? 'settings.standups.actions.deleteQuestion'
						: deleting?.kind === 'schedule'
							? 'settings.standups.actions.deleteSchedule'
							: 'settings.standups.actions.deleteTemplate',
				)}
				loading={deletingBusy}
				onCancel={() => setDeleting(null)}
				onConfirm={() => void confirmDelete()}
			>
				{deleting?.kind === 'template' ? (
					<Stack gap={2}>
						<Text size="sm">{`${questions.length === 1 ? t('settings.standups.count.question.one') : t('settings.standups.count.question.many', { count: questions.length })} ${t('settings.standups.delete.template.attachedQuestions')}`}</Text>
						<Text size="sm">{`${schedules.length === 1 ? t('settings.standups.count.schedule.one') : t('settings.standups.count.schedule.many', { count: schedules.length })} ${t('settings.standups.delete.template.attachedSchedules')}`}</Text>
						<Text size="sm" tone="muted">
							{t('settings.standups.delete.template.hardDeleteNote')}
						</Text>
					</Stack>
				) : deleting?.kind === 'question' ? (
					<Text size="sm" tone="muted">
						{t('settings.standups.delete.question.note')}
					</Text>
				) : deleting?.kind === 'schedule' ? (
					<Text size="sm" tone="muted">
						{t('settings.standups.delete.schedule.note')}
					</Text>
				) : undefined}
			</ConfirmDialog>
		</Stack>
	);
}
