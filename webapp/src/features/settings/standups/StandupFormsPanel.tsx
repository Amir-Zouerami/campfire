import { useState } from 'react';
import type { ReactElement } from 'react';
import { FileQuestion, Loader2, Plus, ScrollText, Sparkles } from 'lucide-react';

import { CampfireSectionTabs, CampfireStatusPill, CampfireSurface, CampfireWorkflowNote } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import type {
	StandupQuestionDraft,
	StandupQuestionDraftPatch,
	StandupTemplateDraft,
	StandupTemplateDraftPatch,
	StandupTemplateWithDraft,
} from './standup-settings.types';
import { StandupQuestionFields } from './StandupQuestionFields';
import { StandupTemplateCard } from './StandupTemplateCard';
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
 * StandupFormsViewID identifies one focused form-builder view.
 */
type StandupFormsViewID = 'create' | 'templates';

/**
 * standupFormsViews lists focused form-builder views.
 */
const standupFormsViews = [
	{
		value: 'create',
		label: 'Create',
		description: 'Add new templates and questions.',
	},
	{
		value: 'templates',
		label: 'Templates',
		description: 'Edit saved templates and attached questions.',
	},
] satisfies ReadonlyArray<{
	readonly value: StandupFormsViewID;
	readonly label: string;
	readonly description: string;
}>;

/**
 * StandupFormsPanel renders template and dynamic-question editing.
 */
export function StandupFormsPanel(props: StandupFormsPanelProps): ReactElement {
	const [activeViewID, setActiveViewID] = useState<StandupFormsViewID>('create');

	const formDisabled = props.disabled || !props.canManageStandups;
	const questionCreateDisabled = formDisabled || props.templates.length === 0;

	return (
		<div className="campfire-standup-builder">
			<CampfireSurface className="campfire-standup-builder-header">
				<div className="campfire-surface-header campfire-surface-header--with-action">
					<div>
						<p className="campfire-surface-eyebrow">Forms</p>
						<h3 className="campfire-surface-title">What Campfire asks</h3>
						<p className="campfire-surface-description">
							Create templates, then attach only the questions your team actually needs.
						</p>
					</div>

					<div className="campfire-pill-row">
						<CampfireStatusPill tone="ember">{props.templatesWithDrafts.length} templates</CampfireStatusPill>
						<CampfireStatusPill tone={props.canManageStandups ? 'green' : 'slate'}>
							{props.canManageStandups ? 'Editable' : 'Read only'}
						</CampfireStatusPill>
					</div>
				</div>

				<CampfireWorkflowNote
					icon={Sparkles}
					title="Task creation is explicit."
					description="Only questions with Create tasks enabled produce task records from itemized answers."
				/>

				<CampfireSectionTabs
					label="Standup form builder sections"
					activeValue={activeViewID}
					tabs={standupFormsViews}
					onChange={setActiveViewID}
				/>
			</CampfireSurface>

			{activeViewID === 'create' && (
				<CreateStandupFormsPanel
					templates={props.templates}
					newTemplate={props.newTemplate}
					newQuestion={props.newQuestion}
					formDisabled={formDisabled}
					questionCreateDisabled={questionCreateDisabled}
					savingID={props.savingID}
					onNewTemplateChange={props.onNewTemplateChange}
					onNewQuestionChange={props.onNewQuestionChange}
					onCreateTemplate={props.onCreateTemplate}
					onCreateQuestion={props.onCreateQuestion}
				/>
			)}

			{activeViewID === 'templates' && (
				<ExistingStandupTemplatesPanel
					templates={props.templates}
					templatesWithDrafts={props.templatesWithDrafts}
					disabled={props.disabled}
					canManageStandups={props.canManageStandups}
					savingID={props.savingID}
					onTemplateDraftChange={props.onTemplateDraftChange}
					onQuestionDraftChange={props.onQuestionDraftChange}
					onSaveTemplate={props.onSaveTemplate}
					onSaveQuestion={props.onSaveQuestion}
				/>
			)}
		</div>
	);
}

/**
 * CreateStandupFormsPanel renders the create-template and create-question workflow.
 */
function CreateStandupFormsPanel(props: {
	readonly templates: readonly StandupTemplate[];
	readonly newTemplate: StandupTemplateDraft;
	readonly newQuestion: StandupQuestionDraft;
	readonly formDisabled: boolean;
	readonly questionCreateDisabled: boolean;
	readonly savingID: string;
	readonly onNewTemplateChange: (patch: StandupTemplateDraftPatch) => void;
	readonly onNewQuestionChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onCreateTemplate: () => Promise<void>;
	readonly onCreateQuestion: () => Promise<void>;
}): ReactElement {
	return (
		<div className="campfire-standup-builder-create-grid">
			<CampfireSurface className="campfire-standup-create-surface">
				<form
					className="campfire-standup-create-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onCreateTemplate();
					}}
				>
					<div className="campfire-surface-header campfire-surface-header--with-action">
						<div>
							<p className="campfire-surface-eyebrow">Step 1</p>
							<h3 className="campfire-surface-title">Create template</h3>
							<p className="campfire-surface-description">
								Give the form a clear PM-friendly name and cadence.
							</p>
						</div>
						<CampfireStatusPill tone="ember">New</CampfireStatusPill>
					</div>

					<StandupTemplateFields
						idPrefix="campfire-new-standup-template"
						draft={props.newTemplate}
						disabled={props.formDisabled}
						includeActiveToggle={false}
						onChange={props.onNewTemplateChange}
					/>

					<div className="campfire-form-actions">
						<Button type="submit" disabled={props.formDisabled}>
							{props.savingID === 'new-template' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Plus className="cf:size-4" />
							)}
							Create template
						</Button>
					</div>
				</form>
			</CampfireSurface>

			<CampfireSurface className="campfire-standup-create-surface">
				<form
					className="campfire-standup-create-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onCreateQuestion();
					}}
				>
					<div className="campfire-surface-header campfire-surface-header--with-action">
						<div>
							<p className="campfire-surface-eyebrow">Step 2</p>
							<h3 className="campfire-surface-title">Create question</h3>
							<p className="campfire-surface-description">
								Attach a concrete input to one existing template.
							</p>
						</div>
						<CampfireStatusPill tone={props.templates.length === 0 ? 'slate' : 'ember'}>
							Question
						</CampfireStatusPill>
					</div>

					{props.templates.length === 0 ? (
						<div className="campfire-flat-empty-state">
							<span className="campfire-flat-empty-icon" aria-hidden="true">
								<ScrollText className="cf:size-5" />
							</span>
							<div>
								<h4>Create a template first</h4>
								<p>Questions need a template before they can be attached.</p>
							</div>
						</div>
					) : (
						<>
							<StandupQuestionFields
								idPrefix="campfire-new-standup-question"
								templates={props.templates}
								draft={props.newQuestion}
								disabled={props.questionCreateDisabled}
								allowTemplateChange={true}
								onChange={props.onNewQuestionChange}
							/>

							<div className="campfire-form-actions">
								<Button type="submit" disabled={props.questionCreateDisabled}>
									{props.savingID === 'new-question' ? (
										<Loader2 className="cf:size-4 cf:animate-spin" />
									) : (
										<Plus className="cf:size-4" />
									)}
									Create question
								</Button>
							</div>
						</>
					)}
				</form>
			</CampfireSurface>
		</div>
	);
}

/**
 * ExistingStandupTemplatesPanel renders saved templates and editable questions.
 */
function ExistingStandupTemplatesPanel(props: {
	readonly templates: readonly StandupTemplate[];
	readonly templatesWithDrafts: readonly StandupTemplateWithDraft[];
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onTemplateDraftChange: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly onQuestionDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onSaveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly onSaveQuestion: (question: StandupQuestion) => Promise<void>;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-standup-template-list-surface">
			<div className="campfire-surface-header campfire-surface-header--with-action">
				<div>
					<p className="campfire-surface-eyebrow">Templates</p>
					<h3 className="campfire-surface-title">Edit existing forms</h3>
					<p className="campfire-surface-description">
						Review saved templates and edit their attached questions.
					</p>
				</div>
				<CampfireStatusPill tone="ember">{props.templatesWithDrafts.length}</CampfireStatusPill>
			</div>

			{props.templatesWithDrafts.length === 0 && (
				<div className="campfire-flat-empty-state">
					<span className="campfire-flat-empty-icon" aria-hidden="true">
						<FileQuestion className="cf:size-5" />
					</span>
					<div>
						<h4>No form templates yet</h4>
						<p>Create a template first, then attach daily or weekly questions.</p>
					</div>
				</div>
			)}

			{props.templatesWithDrafts.length > 0 && (
				<div className="campfire-standup-template-editor-list">
					{props.templatesWithDrafts.map(pair => (
						<StandupTemplateCard
							key={pair.template.id}
							template={pair.template}
							templates={props.templates}
							draft={pair.draft}
							questions={pair.questions}
							disabled={props.disabled}
							canManageStandups={props.canManageStandups}
							savingID={props.savingID}
							onTemplateDraftChange={props.onTemplateDraftChange}
							onQuestionDraftChange={props.onQuestionDraftChange}
							onSaveTemplate={props.onSaveTemplate}
							onSaveQuestion={props.onSaveQuestion}
						/>
					))}
				</div>
			)}
		</CampfireSurface>
	);
}
