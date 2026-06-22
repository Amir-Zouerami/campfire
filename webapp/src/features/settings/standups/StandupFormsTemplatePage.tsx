import { useState } from 'react';
import type { ReactElement } from 'react';
import { FileQuestion, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireConfirmDialog } from '@/components/campfire/CampfireConfirmDialog';
import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { questionHasChanges, shortID, templateHasChanges } from './standup-settings.helpers';
import { countLabel, questionTypeLabel } from './standup-settings.i18n';
import type {
	StandupQuestionDraft,
	StandupTemplateDraftPatch,
	StandupTemplateWithDraft,
} from './standup-settings.types';
import { StandupFormsPageHeader } from './StandupFormsPageHeader';
import { StandupTemplateFields } from './StandupTemplateFields';

/**
 * StandupFormsTemplatePageProps contains one template editor page.
 */
type StandupFormsTemplatePageProps = {
	readonly templateWithDraft: StandupTemplateWithDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onBack: () => void;
	readonly onAddQuestion: () => void;
	readonly onEditQuestion: (questionID: string) => void;
	readonly onTemplateDraftChange: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly onSaveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly onDeleteTemplate: (template: StandupTemplate) => Promise<boolean>;
	readonly onDeleteQuestion: (question: StandupQuestion) => Promise<boolean>;
};

/**
 * StandupFormsTemplatePage renders a spacious single-template editor.
 */
export function StandupFormsTemplatePage(props: StandupFormsTemplatePageProps): ReactElement {
	const { t } = useI18n();
	const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
	const [questionPendingDelete, setQuestionPendingDelete] = useState<StandupQuestion | null>(null);
	const changed = templateHasChanges(props.templateWithDraft.template, props.templateWithDraft.draft);
	const formDisabled = props.disabled || !props.canManageStandups;
	const deletingTemplate = props.savingID === `delete-template-${props.templateWithDraft.template.id}`;
	const deletingQuestionID = questionPendingDelete !== null ? `delete-question-${questionPendingDelete.id}` : '';
	const deletingQuestion = deletingQuestionID !== '' && props.savingID === deletingQuestionID;

	return (
		<div className="campfire-standup-editor-stack">
			<CampfireSurface className="campfire-standup-editor-surface campfire-standup-editor-surface--hero">
				<form
					className="campfire-standup-editor-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onSaveTemplate(props.templateWithDraft.template);
					}}
				>
					<StandupFormsPageHeader
						eyebrow={t('settings.standups.template.eyebrow')}
						title={props.templateWithDraft.template.name}
						description={t('settings.standups.template.description')}
						backLabel={t('settings.standups.actions.backToForms')}
						onBack={props.onBack}
						actions={(
							<div className="campfire-pill-row">
								<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
									{changed ? t('settings.standups.status.unsaved') : t('settings.standups.status.saved')}
								</CampfireStatusPill>
								<Button
									type="button"
									variant="destructive"
									disabled={formDisabled || deletingTemplate}
									onClick={() => setDeleteTemplateDialogOpen(true)}
								>
									{deletingTemplate ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Trash2 className="cf:size-4" />}
									{t('settings.standups.actions.deleteTemplate')}
								</Button>
							</div>
						)}
					/>

					<StandupTemplateFields
						idPrefix={`campfire-template-${props.templateWithDraft.template.id}`}
						draft={props.templateWithDraft.draft}
						disabled={formDisabled}
						includeActiveToggle={true}
						onChange={patch => props.onTemplateDraftChange(props.templateWithDraft.template.id, patch)}
					/>

					<div className="campfire-form-actions campfire-form-actions--right">
						<Button type="submit" disabled={formDisabled || !changed || deletingTemplate}>
							{props.savingID === props.templateWithDraft.template.id ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Save className="cf:size-4" />
							)}
							{t('settings.standups.actions.saveTemplate')}
						</Button>
					</div>
				</form>
			</CampfireSurface>

			<CampfireSurface className="campfire-standup-editor-surface">
				<div className="campfire-standup-editor-section-head">
					<div>
						<p className="campfire-page-eyebrow">{t('settings.standups.questions.eyebrow')}</p>
						<h3>{t('settings.standups.questions.title')}</h3>
						<p>{t('settings.standups.questions.description')}</p>
					</div>

					<Button type="button" disabled={formDisabled} onClick={props.onAddQuestion}>
						<Plus className="cf:size-4" />
						{t('settings.standups.actions.addQuestion')}
					</Button>
				</div>

				{props.templateWithDraft.questions.length === 0 ? (
					<CampfireEmpty icon={FileQuestion} title={t('settings.standups.questions.empty.title')} description={t('settings.standups.questions.empty.description')} />
				) : (
					<div className="campfire-standup-question-directory" role="list">
						{props.templateWithDraft.questions.map(pair => (
							<StandupQuestionDirectoryRow
								key={pair.question.id}
								question={pair.question}
								draft={pair.draft}
								disabled={formDisabled || props.savingID === `delete-question-${pair.question.id}`}
								deleting={props.savingID === `delete-question-${pair.question.id}`}
								onEdit={() => props.onEditQuestion(pair.question.id)}
								onDelete={() => setQuestionPendingDelete(pair.question)}
							/>
						))}
					</div>
				)}
			</CampfireSurface>

			<CampfireConfirmDialog
				open={deleteTemplateDialogOpen}
				intent="danger"
				title={t('settings.standups.delete.template.title')}
				description={t('settings.standups.delete.template.description')}
				confirmLabel={t('settings.standups.actions.deleteTemplate')}
				busy={deletingTemplate}
				onCancel={() => setDeleteTemplateDialogOpen(false)}
				onConfirm={() => {
					void props.onDeleteTemplate(props.templateWithDraft.template).then(deleted => {
						if (!deleted) {
							return;
						}

						setDeleteTemplateDialogOpen(false);
						props.onBack();
					});
				}}
			>
				<ul>
					<li>{countLabel(t, props.templateWithDraft.questions.length, 'settings.standups.count.question.one', 'settings.standups.count.question.many')} {t('settings.standups.delete.template.attachedQuestions')}</li>
					<li>{countLabel(t, props.templateWithDraft.schedules.length, 'settings.standups.count.schedule.one', 'settings.standups.count.schedule.many')} {t('settings.standups.delete.template.attachedSchedules')}</li>
					<li>{t('settings.standups.delete.template.hardDeleteNote')}</li>
				</ul>
			</CampfireConfirmDialog>

			<CampfireConfirmDialog
				open={questionPendingDelete !== null}
				intent="danger"
				title={t('settings.standups.delete.question.title')}
				description={t('settings.standups.delete.question.descriptionShort')}
				confirmLabel={t('settings.standups.actions.deleteQuestion')}
				busy={deletingQuestion}
				onCancel={() => setQuestionPendingDelete(null)}
				onConfirm={() => {
					if (questionPendingDelete === null) {
						return;
					}

					void props.onDeleteQuestion(questionPendingDelete).then(deleted => {
						if (deleted) {
							setQuestionPendingDelete(null);
						}
					});
				}}
			>
				<p className="campfire-destructive-inline-note">
					{t('settings.standups.delete.question.noteShort')}
				</p>
			</CampfireConfirmDialog>
		</div>
	);
}

/**
 * StandupQuestionDirectoryRow renders a single question row in the template editor.
 */
function StandupQuestionDirectoryRow(props: {
	readonly question: StandupQuestion;
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly onEdit: () => void;
	readonly onDelete: () => void;
}): ReactElement {
	const { t } = useI18n();
	const changed = questionHasChanges(props.question, props.draft);

	return (
		<div className="campfire-standup-question-row" role="listitem">
			<button type="button" className="campfire-standup-question-row-main" disabled={props.disabled} onClick={props.onEdit}>
				<CampfireBidiText className="campfire-standup-question-row-title">{props.question.label}</CampfireBidiText>
				<span className="campfire-standup-question-row-meta">
					{questionTypeLabel(t, props.question.type)} · {t('settings.standups.meta.position', { position: props.question.position })} · {shortID(props.question.id)}
				</span>
			</button>

			<span className="campfire-standup-question-row-badges" aria-label={t('settings.standups.aria.questionBehavior')}>
				{props.draft.required && <span>{t('settings.standups.badge.required')}</span>}
				{props.draft.showInReport && <span>{t('settings.standups.badge.report')}</span>}
				{props.draft.createsTasks && <span>{t('settings.standups.badge.tasks')}</span>}
				{changed && <span>{t('settings.standups.status.unsaved')}</span>}
			</span>

			<span className="campfire-directory-row-actions">
				<Button type="button" variant="secondary" size="sm" disabled={props.disabled} onClick={props.onEdit}>
					<Pencil className="cf:size-4" />
					{t('common.edit')}
				</Button>
				<Button type="button" variant="destructive" size="sm" disabled={props.disabled} onClick={props.onDelete}>
					{props.deleting ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Trash2 className="cf:size-4" />}
					{t('common.delete')}
				</Button>
			</span>
		</div>
	);
}
