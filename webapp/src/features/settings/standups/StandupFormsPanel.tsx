import type { ReactElement } from 'react';
import { FileQuestion, Loader2, Plus } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
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
 * StandupFormsPanel renders template and dynamic-question editing.
 */
export function StandupFormsPanel(props: StandupFormsPanelProps): ReactElement {
	const formDisabled = props.disabled || !props.canManageStandups;
	const questionCreateDisabled = formDisabled || props.templates.length === 0;

	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Forms"
				title="What Campfire asks"
				description="Create focused daily and weekly templates, then attach only the questions your team actually needs."
				icon={FileQuestion}
				action={
					<CampfireStatusPill tone="ember">{props.templatesWithDrafts.length} templates</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<form
						className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5"
						onSubmit={event => {
							event.preventDefault();
							void props.onCreateTemplate();
						}}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<div>
								<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">Create template</h3>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
									Start with the form container first.
								</p>
							</div>
							<CampfireStatusPill tone="ember">New</CampfireStatusPill>
						</div>

						<StandupTemplateFields
							idPrefix="campfire-new-standup-template"
							draft={props.newTemplate}
							disabled={formDisabled}
							includeActiveToggle={false}
							onChange={props.onNewTemplateChange}
						/>

						<Button type="submit" disabled={formDisabled}>
							{props.savingID === 'new-template' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Plus className="cf:size-4" />
							)}
							Create template
						</Button>
					</form>

					<form
						className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5"
						onSubmit={event => {
							event.preventDefault();
							void props.onCreateQuestion();
						}}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<div>
								<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">Create question</h3>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
									Attach a question to one template.
								</p>
							</div>
							<CampfireStatusPill tone="ember">New</CampfireStatusPill>
						</div>

						<StandupQuestionFields
							idPrefix="campfire-new-standup-question"
							templates={props.templates}
							draft={props.newQuestion}
							disabled={questionCreateDisabled}
							allowTemplateChange={true}
							onChange={props.onNewQuestionChange}
						/>

						<Button type="submit" disabled={questionCreateDisabled}>
							{props.savingID === 'new-question' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Plus className="cf:size-4" />
							)}
							Create question
						</Button>
					</form>
				</div>

				{props.templatesWithDrafts.length === 0 && (
					<CampfireEmpty
						icon={FileQuestion}
						title="No form templates yet"
						description="Create a template first, then attach daily or weekly questions."
					/>
				)}

				{props.templatesWithDrafts.length > 0 && (
					<div className="cf:grid cf:gap-4">
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
