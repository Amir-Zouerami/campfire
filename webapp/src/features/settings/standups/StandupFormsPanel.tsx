import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
	FileQuestion,
	ListChecks,
	Loader2,
	Pencil,
	Plus,
	Save,
	ScrollText,
} from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { formatDateTime, formatLabel, nextQuestionPosition, questionHasChanges, shortID, templateHasChanges } from './standup-settings.helpers';
import type {
	StandupQuestionDraft,
	StandupQuestionDraftPatch,
	StandupQuestionWithDraft,
	StandupTemplateDraft,
	StandupTemplateDraftPatch,
	StandupTemplateWithDraft,
} from './standup-settings.types';
import { StandupQuestionFields } from './StandupQuestionFields';
import { StandupTemplateFields } from './StandupTemplateFields';

/**
 * StandupFormsPanelProps contains form-builder state and actions.
 */
type StandupFormsPanelProps = {
	readonly templates: readonly StandupTemplate[];
	readonly templatesWithDrafts: readonly StandupTemplateWithDraft[];
	readonly newTemplate: StandupTemplateDraft;
	readonly newQuestion: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onNewTemplateChange: (patch: StandupTemplateDraftPatch) => void;
	readonly onNewQuestionChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onTemplateDraftChange: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly onQuestionDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onCreateTemplate: () => Promise<void>;
	readonly onSaveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly onCreateQuestion: () => Promise<void>;
	readonly onSaveQuestion: (question: StandupQuestion) => Promise<void>;
};

/**
 * StandupBuilderMode identifies the active editor pane.
 */
type StandupBuilderMode = 'template' | 'new-template' | 'new-question' | 'edit-question';

/**
 * StandupFormsPanel renders a focused form-builder workbench.
 */
export function StandupFormsPanel(props: StandupFormsPanelProps): ReactElement {
	const [selectedTemplateID, setSelectedTemplateID] = useState(props.templatesWithDrafts[0]?.template.id ?? '');
	const [mode, setMode] = useState<StandupBuilderMode>(props.templatesWithDrafts.length === 0 ? 'new-template' : 'template');
	const [editingQuestionID, setEditingQuestionID] = useState('');

	const selectedTemplate = useMemo(
		() => props.templatesWithDrafts.find(pair => pair.template.id === selectedTemplateID) ?? props.templatesWithDrafts[0],
		[props.templatesWithDrafts, selectedTemplateID],
	);
	const formDisabled = props.disabled || !props.canManageStandups;
	const selectedTemplateQuestionIDs = useMemo(
		() => new Set((selectedTemplate?.questions ?? []).map(pair => pair.question.id)),
		[selectedTemplate],
	);
	const editingQuestion = useMemo(
		() => selectedTemplate?.questions.find(pair => pair.question.id === editingQuestionID),
		[selectedTemplate, editingQuestionID],
	);

	useEffect(() => {
		if (props.templatesWithDrafts.length === 0) {
			setSelectedTemplateID('');
			setMode('new-template');
			setEditingQuestionID('');
			return;
		}

		if (selectedTemplateID === '' || !props.templatesWithDrafts.some(pair => pair.template.id === selectedTemplateID)) {
			const firstTemplate = props.templatesWithDrafts[0];

			if (firstTemplate === undefined) {
				return;
			}

			setSelectedTemplateID(firstTemplate.template.id);
			setMode('template');
			setEditingQuestionID('');
		}
	}, [props.templatesWithDrafts, selectedTemplateID]);

	useEffect(() => {
		if (editingQuestionID !== '' && !selectedTemplateQuestionIDs.has(editingQuestionID)) {
			setEditingQuestionID('');
			setMode('template');
		}
	}, [editingQuestionID, selectedTemplateQuestionIDs]);

	/**
	 * openTemplateEditor selects one template and returns to its details pane.
	 */
	function openTemplateEditor(templateID: string): void {
		setSelectedTemplateID(templateID);
		setEditingQuestionID('');
		setMode('template');
	}

	/**
	 * openNewQuestionEditor opens the question composer for the selected template.
	 */
	function openNewQuestionEditor(): void {
		if (selectedTemplate === undefined) {
			return;
		}

		props.onNewQuestionChange({
			templateId: selectedTemplate.template.id,
			position: nextQuestionPosition(
				selectedTemplate.template.id,
				selectedTemplate.questions.map(pair => pair.question),
			),
		});
		setEditingQuestionID('');
		setMode('new-question');
	}

	/**
	 * openQuestionEditor opens the single-question edit pane.
	 */
	function openQuestionEditor(questionID: string): void {
		setEditingQuestionID(questionID);
		setMode('edit-question');
	}

	return (
		<div className="campfire-standup-form-workbench">
			<CampfireSurface className="campfire-standup-form-workbench-intro">
				<div className="campfire-standup-form-workbench-intro-row">
					<div>
						<p className="campfire-surface-eyebrow">Form builder</p>
						<h3 className="campfire-surface-title">Edit one standup form at a time</h3>
						<p className="campfire-surface-description">
							Choose a template, adjust its details, then edit or add one question in the work area.
						</p>
					</div>

					<div className="campfire-pill-row">
						<CampfireStatusPill tone="ember">{props.templatesWithDrafts.length} templates</CampfireStatusPill>
						<CampfireStatusPill tone={props.canManageStandups ? 'green' : 'slate'}>
							{props.canManageStandups ? 'Editable' : 'Read only'}
						</CampfireStatusPill>
					</div>
				</div>
			</CampfireSurface>

			<div className="campfire-standup-form-workbench-grid">
				<TemplateLibraryPanel
					templatesWithDrafts={props.templatesWithDrafts}
					selectedTemplateID={selectedTemplate?.template.id ?? ''}
					canManageStandups={props.canManageStandups}
					onSelectTemplate={openTemplateEditor}
					onCreateTemplate={() => {
						setEditingQuestionID('');
						setMode('new-template');
					}}
				/>

				<div className="campfire-standup-form-workbench-main">
					{mode === 'new-template' && (
						<NewTemplateEditor
							draft={props.newTemplate}
							disabled={formDisabled}
							saving={props.savingID === 'new-template'}
							onDraftChange={props.onNewTemplateChange}
							onCreateTemplate={props.onCreateTemplate}
						/>
					)}

					{mode !== 'new-template' && selectedTemplate !== undefined && (
						<SelectedTemplateWorkbench
							templateWithDraft={selectedTemplate}
							templates={props.templates}
							newQuestion={props.newQuestion}
							mode={mode}
							editingQuestion={editingQuestion}
							disabled={props.disabled}
							canManageStandups={props.canManageStandups}
							savingID={props.savingID}
							onTemplateDraftChange={props.onTemplateDraftChange}
							onQuestionDraftChange={props.onQuestionDraftChange}
							onNewQuestionChange={patch => props.onNewQuestionChange({ ...patch, templateId: selectedTemplate.template.id })}
							onSaveTemplate={props.onSaveTemplate}
							onSaveQuestion={props.onSaveQuestion}
							onCreateQuestion={props.onCreateQuestion}
							onAddQuestion={openNewQuestionEditor}
							onEditQuestion={openQuestionEditor}
							onReturnToTemplate={() => {
								setEditingQuestionID('');
								setMode('template');
							}}
						/>
					)}

					{mode !== 'new-template' && selectedTemplate === undefined && (
						<CampfireSurface className="campfire-standup-empty-workbench">
							<CampfireEmpty
								icon={FileQuestion}
								title="No templates yet"
								description="Create the first standup form template before adding questions."
							/>
						</CampfireSurface>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * TemplateLibraryPanel renders the bounded template picker rail.
 */
function TemplateLibraryPanel(props: {
	readonly templatesWithDrafts: readonly StandupTemplateWithDraft[];
	readonly selectedTemplateID: string;
	readonly canManageStandups: boolean;
	readonly onSelectTemplate: (templateID: string) => void;
	readonly onCreateTemplate: () => void;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-standup-template-library">
			<div className="campfire-standup-template-library-header">
				<div>
					<p className="campfire-surface-eyebrow">Templates</p>
					<h3 className="campfire-surface-title">Choose a form</h3>
				</div>

				<Button type="button" disabled={!props.canManageStandups} onClick={props.onCreateTemplate}>
					<Plus className="cf:size-4" />
					New template
				</Button>
			</div>

			{props.templatesWithDrafts.length === 0 && (
				<CampfireEmpty
					icon={FileQuestion}
					title="No templates yet"
					description="Start with a daily or weekly form template."
				/>
			)}

			{props.templatesWithDrafts.length > 0 && (
				<div className="campfire-standup-template-rail" role="list">
					{props.templatesWithDrafts.map(pair => {
						const active = pair.template.id === props.selectedTemplateID;

						return (
							<button
								key={pair.template.id}
								type="button"
								className={active ? 'campfire-standup-template-rail-item campfire-standup-template-rail-item--active' : 'campfire-standup-template-rail-item'}
								aria-current={active ? 'page' : undefined}
								onClick={() => props.onSelectTemplate(pair.template.id)}
							>
								<span className="campfire-standup-template-rail-title">{pair.template.name}</span>
								<span className="campfire-standup-template-rail-meta">
									{formatLabel(pair.template.kind)} · {pair.questions.length} questions
								</span>
								<span className="campfire-standup-template-rail-badges">
									<span>{pair.template.isActive ? 'Active' : 'Inactive'}</span>
									<span>{pair.schedules.length} schedules</span>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</CampfireSurface>
	);
}

/**
 * NewTemplateEditor renders the focused new-template workflow.
 */
function NewTemplateEditor(props: {
	readonly draft: StandupTemplateDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (patch: StandupTemplateDraftPatch) => void;
	readonly onCreateTemplate: () => Promise<void>;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-standup-focused-editor">
			<form
				className="campfire-standup-focused-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onCreateTemplate();
				}}
			>
				<div className="campfire-standup-focused-header">
					<div>
						<p className="campfire-surface-eyebrow">New template</p>
						<h3 className="campfire-surface-title">Create a standup form template</h3>
						<p className="campfire-surface-description">
							Name the form and choose whether it is for daily, weekly, or custom submissions.
						</p>
					</div>
					<CampfireStatusPill tone="ember">Template</CampfireStatusPill>
				</div>

				<StandupTemplateFields
					idPrefix="campfire-new-standup-template"
					draft={props.draft}
					disabled={props.disabled}
					includeActiveToggle={false}
					onChange={props.onDraftChange}
				/>

				<div className="campfire-form-actions">
					<Button type="submit" disabled={props.disabled}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
						Create template
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}

/**
 * SelectedTemplateWorkbench renders one selected template and one active editor.
 */
function SelectedTemplateWorkbench(props: {
	readonly templateWithDraft: StandupTemplateWithDraft;
	readonly templates: readonly StandupTemplate[];
	readonly newQuestion: StandupQuestionDraft;
	readonly mode: StandupBuilderMode;
	readonly editingQuestion?: StandupQuestionWithDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onTemplateDraftChange: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly onQuestionDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onNewQuestionChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onSaveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly onSaveQuestion: (question: StandupQuestion) => Promise<void>;
	readonly onCreateQuestion: () => Promise<void>;
	readonly onAddQuestion: () => void;
	readonly onEditQuestion: (questionID: string) => void;
	readonly onReturnToTemplate: () => void;
}): ReactElement {
	const templateChanged = templateHasChanges(props.templateWithDraft.template, props.templateWithDraft.draft);
	const formDisabled = props.disabled || !props.canManageStandups;

	return (
		<div className="campfire-selected-template-workbench">
			<CampfireSurface className="campfire-standup-focused-editor campfire-standup-template-detail-editor">
				<form
					className="campfire-standup-focused-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onSaveTemplate(props.templateWithDraft.template);
					}}
				>
					<div className="campfire-standup-focused-header">
						<div>
							<p className="campfire-surface-eyebrow">Selected template</p>
							<h3 className="campfire-surface-title">{props.templateWithDraft.template.name}</h3>
							<p className="campfire-surface-description">
								Updated {formatDateTime(props.templateWithDraft.template.updatedAt)}
							</p>
						</div>
						<div className="campfire-pill-row">
							<CampfireStatusPill tone={props.templateWithDraft.draft.isActive ? 'green' : 'slate'}>
								{props.templateWithDraft.draft.isActive ? 'Active' : 'Inactive'}
							</CampfireStatusPill>
							<CampfireStatusPill tone={templateChanged ? 'ember' : 'green'}>
								{templateChanged ? 'Unsaved' : 'Saved'}
							</CampfireStatusPill>
						</div>
					</div>


					<StandupTemplateFields
						idPrefix={`campfire-template-${props.templateWithDraft.template.id}`}
						draft={props.templateWithDraft.draft}
						disabled={formDisabled}
						includeActiveToggle={true}
						onChange={patch => props.onTemplateDraftChange(props.templateWithDraft.template.id, patch)}
					/>

					<div className="campfire-form-actions">
						<Button type="submit" disabled={formDisabled || !templateChanged}>
							{props.savingID === props.templateWithDraft.template.id ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Save className="cf:size-4" />
							)}
							Save template details
						</Button>
					</div>
				</form>
			</CampfireSurface>

			<div className="campfire-question-workbench-grid">
				<QuestionLibraryPanel
					questions={props.templateWithDraft.questions}
					activeQuestionID={props.editingQuestion?.question.id ?? ''}
					canManageStandups={props.canManageStandups}
					onAddQuestion={props.onAddQuestion}
					onEditQuestion={props.onEditQuestion}
				/>

				<QuestionEditorPane
					templates={props.templates}
					selectedTemplate={props.templateWithDraft.template}
					mode={props.mode}
					newQuestion={props.newQuestion}
					editingQuestion={props.editingQuestion}
					disabled={props.disabled}
					canManageStandups={props.canManageStandups}
					savingID={props.savingID}
					onNewQuestionChange={props.onNewQuestionChange}
					onQuestionDraftChange={props.onQuestionDraftChange}
					onCreateQuestion={props.onCreateQuestion}
					onSaveQuestion={props.onSaveQuestion}
					onReturnToTemplate={props.onReturnToTemplate}
				/>
			</div>
		</div>
	);
}

/**
 * QuestionLibraryPanel renders the bounded question list for one template.
 */
function QuestionLibraryPanel(props: {
	readonly questions: readonly StandupQuestionWithDraft[];
	readonly activeQuestionID: string;
	readonly canManageStandups: boolean;
	readonly onAddQuestion: () => void;
	readonly onEditQuestion: (questionID: string) => void;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-question-library-panel">
			<div className="campfire-question-library-header">
				<div>
					<p className="campfire-surface-eyebrow">Questions</p>
					<h3 className="campfire-surface-title">Question list</h3>
				</div>

				<Button type="button" disabled={!props.canManageStandups} onClick={props.onAddQuestion}>
					<Plus className="cf:size-4" />
					Add question
				</Button>
			</div>

			{props.questions.length === 0 && (
				<CampfireEmpty
					icon={ScrollText}
					title="No questions yet"
					description="Add one question to start building this form."
				/>
			)}

			{props.questions.length > 0 && (
				<div className="campfire-question-table" role="list">
					{props.questions.map(pair => (
						<QuestionListRow
							key={pair.question.id}
							question={pair.question}
							draft={pair.draft}
							active={pair.question.id === props.activeQuestionID}
							onEdit={() => props.onEditQuestion(pair.question.id)}
						/>
					))}
				</div>
			)}
		</CampfireSurface>
	);
}

/**
 * QuestionListRow renders one compact question row.
 */
function QuestionListRow(props: {
	readonly question: StandupQuestion;
	readonly draft: StandupQuestionDraft;
	readonly active: boolean;
	readonly onEdit: () => void;
}): ReactElement {
	const changed = questionHasChanges(props.question, props.draft);

	return (
		<button
			type="button"
			className={props.active ? 'campfire-question-table-row campfire-question-table-row--active' : 'campfire-question-table-row'}
			onClick={props.onEdit}
		>
			<span className="campfire-question-row-main">
				<span className="campfire-question-row-title">{props.question.label}</span>
				<span className="campfire-question-row-meta">
					{formatLabel(props.question.type)} · position {props.question.position} · {shortID(props.question.id)}
				</span>
			</span>

			<span className="campfire-question-row-badges">
				{props.draft.required && <span>Required</span>}
				{visibilityLabel(props.draft)}
				{props.draft.createsTasks && <span>Tasks</span>}
				{changed && <span>Unsaved</span>}
			</span>

			<span className="campfire-question-row-action" aria-hidden="true">
				<Pencil className="cf:size-4" />
			</span>
		</button>
	);
}

/**
 * QuestionEditorPane renders one create/edit question form at a time.
 */
function QuestionEditorPane(props: {
	readonly templates: readonly StandupTemplate[];
	readonly selectedTemplate: StandupTemplate;
	readonly mode: StandupBuilderMode;
	readonly newQuestion: StandupQuestionDraft;
	readonly editingQuestion?: StandupQuestionWithDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onNewQuestionChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onQuestionDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onCreateQuestion: () => Promise<void>;
	readonly onSaveQuestion: (question: StandupQuestion) => Promise<void>;
	readonly onReturnToTemplate: () => void;
}): ReactElement {
	const formDisabled = props.disabled || !props.canManageStandups;

	if (props.mode === 'new-question') {
		return (
			<CampfireSurface className="campfire-question-focused-editor">
				<form
					className="campfire-standup-focused-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onCreateQuestion();
					}}
				>
					<div className="campfire-question-editor-heading">
						<div>
							<p className="campfire-surface-eyebrow">New question</p>
							<h3 className="campfire-surface-title">Add a question to {props.selectedTemplate.name}</h3>
						</div>
						<CampfireStatusPill tone="ember">Question</CampfireStatusPill>
					</div>

					<StandupQuestionFields
						idPrefix="campfire-new-standup-question"
						templates={props.templates}
						draft={{ ...props.newQuestion, templateId: props.selectedTemplate.id }}
						disabled={formDisabled}
						allowTemplateChange={false}
						hideTemplateField={true}
						onChange={props.onNewQuestionChange}
					/>

					<div className="campfire-form-actions campfire-form-actions--split">
						<Button type="button" variant="ghost" onClick={props.onReturnToTemplate}>
							Cancel
						</Button>
						<Button type="submit" disabled={formDisabled}>
							{props.savingID === 'new-question' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Plus className="cf:size-4" />
							)}
							Add question
						</Button>
					</div>
				</form>
			</CampfireSurface>
		);
	}

	if (props.mode === 'edit-question' && props.editingQuestion !== undefined) {
		const editingQuestion = props.editingQuestion;
		const changed = questionHasChanges(editingQuestion.question, editingQuestion.draft);

		return (
			<CampfireSurface className="campfire-question-focused-editor">
				<form
					className="campfire-standup-focused-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onSaveQuestion(editingQuestion.question);
					}}
				>
					<div className="campfire-question-editor-heading">
						<div>
							<p className="campfire-surface-eyebrow">Edit question</p>
							<h3 className="campfire-surface-title">{editingQuestion.question.label}</h3>
						</div>
						<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
							{changed ? 'Unsaved' : 'Saved'}
						</CampfireStatusPill>
					</div>

					<StandupQuestionFields
						idPrefix={`campfire-question-${editingQuestion.question.id}`}
						templates={props.templates}
						draft={editingQuestion.draft}
						disabled={formDisabled}
						allowTemplateChange={true}
						hideTemplateField={false}
						onChange={patch => props.onQuestionDraftChange(editingQuestion.question.id, patch)}
					/>

					<div className="campfire-form-actions campfire-form-actions--split">
						<Button type="button" variant="ghost" onClick={props.onReturnToTemplate}>
							Close editor
						</Button>
						<Button type="submit" disabled={formDisabled || !changed}>
							{props.savingID === editingQuestion.question.id ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Save className="cf:size-4" />
							)}
							Save question
						</Button>
					</div>
				</form>
			</CampfireSurface>
		);
	}

	return (
		<CampfireSurface className="campfire-question-focused-editor campfire-question-focused-editor--empty">
			<CampfireEmpty
				icon={ListChecks}
				title="Select a question or add a new one"
				description="Question editing opens here so the template page does not turn into a long stacked scroll."
			/>
		</CampfireSurface>
	);
}

/**
 * visibilityLabel describes the merged report/private visibility state.
 */
function visibilityLabel(draft: StandupQuestionDraft): ReactElement {
	if (draft.isPrivate) {
		return <span>Private</span>;
	}

	if (draft.showInReport) {
		return <span>Posted</span>;
	}

	return <span>Internal</span>;
}
