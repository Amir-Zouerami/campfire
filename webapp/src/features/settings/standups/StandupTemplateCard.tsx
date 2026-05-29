import type { ReactElement } from 'react';
import { FileQuestion, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { formatDateTime, formatLabel, templateHasChanges } from './standup-settings.helpers';
import type {
	StandupQuestionDraftPatch,
	StandupQuestionWithDraft,
	StandupTemplateDraft,
	StandupTemplateDraftPatch,
} from './standup-settings.types';
import { StandupQuestionCard } from './StandupQuestionCard';
import { StandupTemplateFields } from './StandupTemplateFields';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * StandupTemplateCardProps contains one template and attached questions.
 */
type StandupTemplateCardProps = {
	readonly template: StandupTemplate;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupTemplateDraft;
	readonly questions: readonly StandupQuestionWithDraft[];
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onTemplateDraftChange: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly onQuestionDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onSaveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly onSaveQuestion: (question: StandupQuestion) => Promise<void>;
};

/**
 * StandupTemplateCard renders one template editor with its question list.
 */
export function StandupTemplateCard(props: StandupTemplateCardProps): ReactElement {
	const changed = templateHasChanges(props.template, props.draft);
	const formDisabled = props.disabled || !props.canManageStandups;

	return (
		<article className="campfire-standup-template-editor">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{formatLabel(props.template.kind)} template
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						{props.template.name}
					</h3>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Updated {formatDateTime(props.template.updatedAt)}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<CampfireStatusPill tone={props.draft.isActive ? 'green' : 'slate'}>
						{props.draft.isActive ? 'Active' : 'Inactive'}
					</CampfireStatusPill>
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved' : 'Saved'}
					</CampfireStatusPill>
				</div>
			</div>

			<StandupTemplateFields
				idPrefix={`campfire-template-${props.template.id}`}
				draft={props.draft}
				disabled={formDisabled}
				includeActiveToggle={true}
				onChange={patch => props.onTemplateDraftChange(props.template.id, patch)}
			/>

			<div className="cf:flex cf:justify-end">
				<Button
					type="button"
					disabled={formDisabled || !changed}
					onClick={() => void props.onSaveTemplate(props.template)}
				>
					{props.savingID === props.template.id ? (
						<Loader2 className="cf:size-4 cf:animate-spin" />
					) : (
						<Save className="cf:size-4" />
					)}
					Save template
				</Button>
			</div>

			<div className="campfire-standup-template-questions">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
					<div>
						<h4 className="cf:m-0 cf:text-base cf:font-semibold cf:text-foreground">Questions</h4>
						<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-semibold cf:text-muted-foreground">
							{props.questions.length} attached to this template
						</p>
					</div>
					<CampfireStatusPill tone="slate">{props.questions.length}</CampfireStatusPill>
				</div>

				{props.questions.length === 0 && (
					<CampfireEmpty
						icon={FileQuestion}
						title="No questions yet"
						description="Use the create-question panel above to attach the first question."
					/>
				)}

				{props.questions.length > 0 && (
					<div className="campfire-standup-question-editor-list">
						{props.questions.map(pair => (
							<StandupQuestionCard
								key={pair.question.id}
								question={pair.question}
								templates={props.templates}
								draft={pair.draft}
								disabled={props.disabled}
								canManageStandups={props.canManageStandups}
								saving={props.savingID === pair.question.id}
								onDraftChange={props.onQuestionDraftChange}
								onSave={props.onSaveQuestion}
							/>
						))}
					</div>
				)}
			</div>
		</article>
	);
}