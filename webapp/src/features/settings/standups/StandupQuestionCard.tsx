import type { ReactElement } from 'react';
import { Loader2, Save } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import type { StandupQuestion, StandupTemplate } from '@/types/domain';

import { formatLabel, questionHasChanges, shortID } from './standup-settings.helpers';
import type { StandupQuestionDraft, StandupQuestionDraftPatch } from './standup-settings.types';
import { StandupQuestionFields } from './StandupQuestionFields';

/**
 * StandupQuestionCardProps contains one persisted question and editable draft.
 */
type StandupQuestionCardProps = {
	readonly question: StandupQuestion;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly onSave: (question: StandupQuestion) => Promise<void>;
};

/**
 * StandupQuestionCard renders one editable form-builder question.
 */
export function StandupQuestionCard(props: StandupQuestionCardProps): ReactElement {
	const changed = questionHasChanges(props.question, props.draft);
	const formDisabled = props.disabled || !props.canManageStandups;

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{formatLabel(props.question.type)} · position {props.question.position}
					</p>
					<h4 className="cf:mt-1 cf:text-base cf:font-black cf:text-foreground">{props.question.label}</h4>
					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Question {shortID(props.question.id)}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.question.required && <CampfireStatusPill tone="ember">Required</CampfireStatusPill>}
					{props.question.showInReport && <CampfireStatusPill tone="green">Report</CampfireStatusPill>}
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved' : 'Saved'}
					</CampfireStatusPill>
				</div>
			</div>

			<StandupQuestionFields
				idPrefix={`campfire-question-${props.question.id}`}
				templates={props.templates}
				draft={props.draft}
				disabled={formDisabled}
				allowTemplateChange={true}
				onChange={patch => props.onDraftChange(props.question.id, patch)}
			/>

			<div className="cf:flex cf:justify-end">
				<Button
					type="button"
					disabled={formDisabled || !changed}
					onClick={() => void props.onSave(props.question)}
				>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save question
				</Button>
			</div>
		</article>
	);
}
