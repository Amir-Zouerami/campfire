import { useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';

import { CampfireConfirmDialog } from '@/components/campfire/CampfireConfirmDialog';
import { CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { StandupTemplate } from '@/types/domain';

import type { StandupQuestionDraft, StandupQuestionDraftPatch } from './standup-settings.types';
import { StandupFormsPageHeader } from './StandupFormsPageHeader';
import { StandupQuestionFields } from './StandupQuestionFields';

/**
 * StandupFormsQuestionPageProps contains one dedicated question editor.
 */
type StandupFormsQuestionPageProps = {
	readonly title: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly deleting?: boolean;
	readonly allowTemplateChange: boolean;
	readonly changed?: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onSave: () => Promise<void>;
	readonly onDelete?: () => Promise<boolean>;
};

/**
 * StandupFormsQuestionPage renders a full-page question editor.
 */
export function StandupFormsQuestionPage(props: StandupFormsQuestionPageProps): ReactElement {
	const { t } = useI18n();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const changed = props.changed ?? true;
	const canDelete = props.onDelete !== undefined;
	const mutationBusy = props.saving || props.deleting === true;

	return (
		<CampfireSurface className="campfire-standup-editor-surface campfire-standup-editor-surface--hero">
			<form
				className="campfire-standup-editor-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onSave();
				}}
			>
				<StandupFormsPageHeader
					eyebrow={t('settings.standups.question.eyebrow')}
					title={props.title}
					description={t('settings.standups.question.description')}
					backLabel={t('settings.standups.actions.backToTemplate')}
					onBack={props.onBack}
					actions={(
						<div className="campfire-pill-row">
							{props.changed !== undefined && (
								<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
									{changed ? t('settings.standups.status.unsaved') : t('settings.standups.status.saved')}
								</CampfireStatusPill>
							)}
							{canDelete && (
								<Button
									type="button"
									variant="destructive"
									disabled={props.disabled || mutationBusy}
									onClick={() => setDeleteDialogOpen(true)}
								>
									{props.deleting === true ? (
										<Loader2 className="cf:size-4 cf:animate-spin" />
									) : (
										<Trash2 className="cf:size-4" />
									)}
									{t('settings.standups.actions.deleteQuestion')}
								</Button>
							)}
						</div>
					)}
				/>

				<StandupQuestionFields
					idPrefix="campfire-focused-standup-question"
					templates={props.templates}
					draft={props.draft}
					disabled={props.disabled}
					allowTemplateChange={props.allowTemplateChange}
					hideTemplateField={!props.allowTemplateChange}
					onChange={props.onDraftChange}
				/>

				<div className="campfire-form-actions campfire-form-actions--split">
					<Button type="button" variant="ghost" onClick={props.onBack}>{t('common.back')}</Button>
					<Button type="submit" disabled={props.disabled || !changed || mutationBusy}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						{t('settings.standups.actions.saveQuestion')}
					</Button>
				</div>
			</form>

			<CampfireConfirmDialog
				open={deleteDialogOpen}
				intent="danger"
				title={t('settings.standups.delete.question.title')}
				description={t('settings.standups.delete.question.descriptionLong')}
				confirmLabel="{t('settings.standups.actions.deleteQuestion')}"
				busy={props.deleting === true}
				onCancel={() => setDeleteDialogOpen(false)}
				onConfirm={() => {
					if (props.onDelete === undefined) {
						return;
					}

					void props.onDelete().then(deleted => {
						if (!deleted) {
							return;
						}

						setDeleteDialogOpen(false);
						props.onBack();
					});
				}}
			>
				<p className="campfire-destructive-inline-note">
					{t('settings.standups.delete.question.note')}
				</p>
			</CampfireConfirmDialog>
		</CampfireSurface>
	);
}
