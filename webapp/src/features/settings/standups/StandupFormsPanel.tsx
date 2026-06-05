import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { nextQuestionPosition, questionHasChanges } from './standup-settings.helpers';
import type {
	StandupQuestionDraft,
	StandupQuestionDraftPatch,
	StandupQuestionWithDraft,
	StandupTemplateDraft,
	StandupTemplateDraftPatch,
	StandupTemplateWithDraft,
} from './standup-settings.types';
import { StandupFormsLibraryPage } from './StandupFormsLibraryPage';
import { StandupFormsNewTemplatePage } from './StandupFormsNewTemplatePage';
import { StandupFormsQuestionPage } from './StandupFormsQuestionPage';
import { StandupFormsTemplatePage } from './StandupFormsTemplatePage';

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
 * StandupFormsView identifies the current full-page form-builder view.
 */
type StandupFormsView = 'library' | 'new-template' | 'template' | 'new-question' | 'edit-question';

/**
 * StandupFormsPanel coordinates dedicated full-page form-builder screens.
 */
export function StandupFormsPanel(props: StandupFormsPanelProps): ReactElement {
	const [selectedTemplateID, setSelectedTemplateID] = useState(props.templatesWithDrafts[0]?.template.id ?? '');
	const [editingQuestionID, setEditingQuestionID] = useState('');
	const [view, setView] = useState<StandupFormsView>('library');

	const selectedTemplate = useMemo(
		() => props.templatesWithDrafts.find(pair => pair.template.id === selectedTemplateID) ?? props.templatesWithDrafts[0],
		[props.templatesWithDrafts, selectedTemplateID],
	);
	const selectedTemplateQuestionIDs = useMemo(
		() => new Set((selectedTemplate?.questions ?? []).map(pair => pair.question.id)),
		[selectedTemplate],
	);
	const editingQuestion = useMemo<StandupQuestionWithDraft | undefined>(
		() => selectedTemplate?.questions.find(pair => pair.question.id === editingQuestionID),
		[selectedTemplate, editingQuestionID],
	);
	const formDisabled = props.disabled || !props.canManageStandups;

	useEffect(() => {
		if (props.templatesWithDrafts.length === 0) {
			setSelectedTemplateID('');
			setEditingQuestionID('');
			setView(current => (current === 'new-template' ? current : 'library'));
			return;
		}

		if (selectedTemplateID === '' || !props.templatesWithDrafts.some(pair => pair.template.id === selectedTemplateID)) {
			setSelectedTemplateID(props.templatesWithDrafts[0]?.template.id ?? '');
			setEditingQuestionID('');
			setView('library');
		}
	}, [props.templatesWithDrafts, selectedTemplateID]);

	useEffect(() => {
		if (editingQuestionID !== '' && !selectedTemplateQuestionIDs.has(editingQuestionID)) {
			setEditingQuestionID('');
			setView('template');
		}
	}, [editingQuestionID, selectedTemplateQuestionIDs]);

	/**
	 * openTemplate selects a template and opens the template detail page.
	 */
	function openTemplate(templateID: string): void {
		setSelectedTemplateID(templateID);
		setEditingQuestionID('');
		setView('template');
	}

	/**
	 * openNewQuestion prepares a new question under the selected template.
	 */
	function openNewQuestion(): void {
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
		setView('new-question');
	}

	/**
	 * openQuestion opens one existing question editor.
	 */
	function openQuestion(questionID: string): void {
		setEditingQuestionID(questionID);
		setView('edit-question');
	}

	if (view === 'new-template') {
		return (
			<StandupFormsNewTemplatePage
				draft={props.newTemplate}
				disabled={formDisabled}
				saving={props.savingID === 'new-template'}
				onBack={() => setView('library')}
				onDraftChange={props.onNewTemplateChange}
				onCreateTemplate={props.onCreateTemplate}
			/>
		);
	}

	if (view === 'template' && selectedTemplate !== undefined) {
		return (
			<StandupFormsTemplatePage
				templateWithDraft={selectedTemplate}
				disabled={props.disabled}
				canManageStandups={props.canManageStandups}
				savingID={props.savingID}
				onBack={() => setView('library')}
				onAddQuestion={openNewQuestion}
				onEditQuestion={openQuestion}
				onTemplateDraftChange={props.onTemplateDraftChange}
				onSaveTemplate={props.onSaveTemplate}
			/>
		);
	}

	if (view === 'new-question' && selectedTemplate !== undefined) {
		return (
			<StandupFormsQuestionPage
				title={`Add a question to ${selectedTemplate.template.name}`}
				templates={props.templates}
				draft={{ ...props.newQuestion, templateId: selectedTemplate.template.id }}
				disabled={formDisabled}
				saving={props.savingID === 'new-question'}
				allowTemplateChange={false}
				onBack={() => setView('template')}
				onDraftChange={props.onNewQuestionChange}
				onSave={props.onCreateQuestion}
			/>
		);
	}

	if (view === 'edit-question' && editingQuestion !== undefined) {
		const changed = questionHasChanges(editingQuestion.question, editingQuestion.draft);

		return (
			<StandupFormsQuestionPage
				title={editingQuestion.question.label}
				templates={props.templates}
				draft={editingQuestion.draft}
				disabled={formDisabled}
				saving={props.savingID === editingQuestion.question.id}
				allowTemplateChange={true}
				changed={changed}
				onBack={() => setView('template')}
				onDraftChange={patch => props.onQuestionDraftChange(editingQuestion.question.id, patch)}
				onSave={() => props.onSaveQuestion(editingQuestion.question)}
			/>
		);
	}

	return (
		<StandupFormsLibraryPage
			templatesWithDrafts={props.templatesWithDrafts}
			canManageStandups={props.canManageStandups}
			onSelectTemplate={openTemplate}
			onCreateTemplate={() => setView('new-template')}
		/>
	);
}
