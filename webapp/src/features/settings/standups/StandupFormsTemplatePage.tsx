import type { ReactElement } from 'react';
import { FileQuestion, Loader2, Pencil, Plus, Save } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { formatLabel, questionHasChanges, shortID, templateHasChanges } from './standup-settings.helpers';
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
};

/**
 * StandupFormsTemplatePage renders a spacious single-template editor.
 */
export function StandupFormsTemplatePage(props: StandupFormsTemplatePageProps): ReactElement {
	const changed = templateHasChanges(props.templateWithDraft.template, props.templateWithDraft.draft);
	const formDisabled = props.disabled || !props.canManageStandups;

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
						eyebrow="Template"
						title={props.templateWithDraft.template.name}
						description="Edit the form identity first. Questions stay on their own list below."
						backLabel="Back to forms"
						onBack={props.onBack}
						actions={<CampfireStatusPill tone={changed ? 'ember' : 'green'}>{changed ? 'Unsaved' : 'Saved'}</CampfireStatusPill>}
					/>

					<StandupTemplateFields
						idPrefix={`campfire-template-${props.templateWithDraft.template.id}`}
						draft={props.templateWithDraft.draft}
						disabled={formDisabled}
						includeActiveToggle={true}
						onChange={patch => props.onTemplateDraftChange(props.templateWithDraft.template.id, patch)}
					/>

					<div className="campfire-form-actions campfire-form-actions--right">
						<Button type="submit" disabled={formDisabled || !changed}>
							{props.savingID === props.templateWithDraft.template.id ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Save className="cf:size-4" />
							)}
							Save template
						</Button>
					</div>
				</form>
			</CampfireSurface>

			<CampfireSurface className="campfire-standup-editor-surface">
				<div className="campfire-standup-editor-section-head">
					<div>
						<p className="campfire-page-eyebrow">Questions</p>
						<h3>Edit one question at a time</h3>
						<p>Open a question to change its label, type, reporting behavior, and task creation behavior.</p>
					</div>

					<Button type="button" disabled={formDisabled} onClick={props.onAddQuestion}>
						<Plus className="cf:size-4" />
						Add question
					</Button>
				</div>

				{props.templateWithDraft.questions.length === 0 ? (
					<CampfireEmpty icon={FileQuestion} title="No questions yet" description="Add the first question for this form." />
				) : (
					<div className="campfire-standup-question-directory" role="list">
						{props.templateWithDraft.questions.map(pair => (
							<StandupQuestionDirectoryRow
								key={pair.question.id}
								question={pair.question}
								draft={pair.draft}
								onEdit={() => props.onEditQuestion(pair.question.id)}
							/>
						))}
					</div>
				)}
			</CampfireSurface>
		</div>
	);
}

/**
 * StandupQuestionDirectoryRow renders a single question row in the template editor.
 */
function StandupQuestionDirectoryRow(props: {
	readonly question: StandupQuestion;
	readonly draft: StandupQuestionDraft;
	readonly onEdit: () => void;
}): ReactElement {
	const changed = questionHasChanges(props.question, props.draft);

	return (
		<button type="button" className="campfire-standup-question-row" onClick={props.onEdit}>
			<span className="campfire-standup-question-row-main">
				<CampfireBidiText className="campfire-standup-question-row-title">{props.question.label}</CampfireBidiText>
				<span className="campfire-standup-question-row-meta">
					{formatLabel(props.question.type)} · position {props.question.position} · {shortID(props.question.id)}
				</span>
			</span>

			<span className="campfire-standup-question-row-badges" aria-label="Question behavior">
				{props.draft.required && <span>Required</span>}
				{props.draft.showInReport && <span>Report</span>}
				{props.draft.createsTasks && <span>Tasks</span>}
				{changed && <span>Unsaved</span>}
			</span>

			<span className="campfire-standup-question-row-action">
				<Pencil className="cf:size-4" />
				Edit
			</span>
		</button>
	);
}