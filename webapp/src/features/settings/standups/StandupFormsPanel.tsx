import { useState } from 'react';
import type { ReactElement } from 'react';
import { FileQuestion, Layers3, Loader2, Plus, ScrollText } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
 * StandupFormsView describes one local form-builder tab.
 */
type StandupFormsView = {
	readonly id: StandupFormsViewID;
	readonly label: string;
	readonly description: string;
	readonly icon: typeof FileQuestion;
};

/**
 * standupFormsViews lists focused form-builder views.
 */
const standupFormsViews: readonly StandupFormsView[] = [
	{
		id: 'create',
		label: 'Create',
		description: 'Add new templates and questions.',
		icon: Plus,
	},
	{
		id: 'templates',
		label: 'Templates',
		description: 'Edit saved templates and attached questions.',
		icon: Layers3,
	},
];

/**
 * StandupFormsPanel renders template and dynamic-question editing.
 */
export function StandupFormsPanel(props: StandupFormsPanelProps): ReactElement {
	const [activeViewID, setActiveViewID] = useState<StandupFormsViewID>('create');

	const formDisabled = props.disabled || !props.canManageStandups;
	const questionCreateDisabled = formDisabled || props.templates.length === 0;

	return (
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Forms"
					title="What Campfire asks"
					description="Create templates, then attach only the questions your team actually needs."
					icon={FileQuestion}
					action={
						<div className="cf:flex cf:flex-wrap cf:gap-2">
							<CampfireStatusPill tone="ember">
								{props.templatesWithDrafts.length} templates
							</CampfireStatusPill>
							<CampfireStatusPill tone={props.canManageStandups ? 'green' : 'slate'}>
								{props.canManageStandups ? 'Editable' : 'Read only'}
							</CampfireStatusPill>
						</div>
					}
				/>

				<CampfireCardBody className="cf:grid cf:gap-5">
					<StandupFormsNavigation activeViewID={activeViewID} onSelectView={setActiveViewID} />
				</CampfireCardBody>
			</CampfirePanel>

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
 * StandupFormsNavigation renders local form-builder navigation.
 */
function StandupFormsNavigation(props: {
	readonly activeViewID: StandupFormsViewID;
	readonly onSelectView: (viewID: StandupFormsViewID) => void;
}): ReactElement {
	return (
		<nav className="campfire-standup-forms-nav" aria-label="Standup form builder sections">
			{standupFormsViews.map(view => {
				const active = view.id === props.activeViewID;
				const Icon = view.icon;

				return (
					<button
						key={view.id}
						type="button"
						aria-current={active ? 'page' : undefined}
						className={cn(
							'campfire-standup-forms-nav-button',
							active && 'campfire-standup-forms-nav-button--active',
						)}
						onClick={() => props.onSelectView(view.id)}
					>
						<span className="campfire-standup-forms-nav-icon">
							<Icon className="cf:size-5" />
						</span>

						<span className="cf:min-w-0">
							<span className="cf:block cf:text-base cf:font-black cf:tracking-[-0.02em] cf:text-foreground">
								{view.label}
							</span>
							<span className="cf:mt-1 cf:block cf:text-sm cf:font-semibold cf:leading-5 cf:text-muted-foreground">
								{view.description}
							</span>
						</span>
					</button>
				);
			})}
		</nav>
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
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Create"
				title="Add form pieces"
				description="Create the template first, then add questions to it."
				icon={Plus}
				action={<CampfireStatusPill tone="ember">New</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<form
						className="cf:grid cf:content-start cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5"
						onSubmit={event => {
							event.preventDefault();
							void props.onCreateTemplate();
						}}
					>
						<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
							<div>
								<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">Create template</h3>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
									The template is the daily, weekly, or custom form container.
								</p>
							</div>

							<CampfireStatusPill tone="ember">Step 1</CampfireStatusPill>
						</div>

						<StandupTemplateFields
							idPrefix="campfire-new-standup-template"
							draft={props.newTemplate}
							disabled={props.formDisabled}
							includeActiveToggle={false}
							onChange={props.onNewTemplateChange}
						/>

						<div className="cf:flex cf:justify-end">
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

					<form
						className="cf:grid cf:content-start cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5"
						onSubmit={event => {
							event.preventDefault();
							void props.onCreateQuestion();
						}}
					>
						<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
							<div>
								<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">Create question</h3>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
									Attach one question to an existing template.
								</p>
							</div>

							<CampfireStatusPill tone={props.templates.length === 0 ? 'slate' : 'ember'}>
								Step 2
							</CampfireStatusPill>
						</div>

						{props.templates.length === 0 ? (
							<CampfireEmpty
								icon={ScrollText}
								title="Create a template first"
								description="Questions need a template before they can be attached."
							/>
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

								<div className="cf:flex cf:justify-end">
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
				</div>
			</CampfireCardBody>
		</CampfirePanel>
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
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Templates"
				title="Edit existing forms"
				description="Review saved templates and edit their attached questions."
				icon={Layers3}
				action={<CampfireStatusPill tone="ember">{props.templatesWithDrafts.length}</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				{props.templatesWithDrafts.length === 0 && (
					<CampfireEmpty
						icon={FileQuestion}
						title="No form templates yet"
						description="Create a template first, then attach daily or weekly questions."
					/>
				)}

				{props.templatesWithDrafts.length > 0 && (
					<div className="cf:grid cf:gap-5">
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
			</CampfireCardBody>
		</CampfirePanel>
	);
}
