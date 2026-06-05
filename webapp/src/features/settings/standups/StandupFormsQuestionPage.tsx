import type { ReactElement } from 'react';
import { Loader2, Save } from 'lucide-react';

import { CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
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
	readonly allowTemplateChange: boolean;
	readonly changed?: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (patch: StandupQuestionDraftPatch) => void;
	readonly onSave: () => Promise<void>;
};

/**
 * StandupFormsQuestionPage renders a full-page question editor.
 */
export function StandupFormsQuestionPage(props: StandupFormsQuestionPageProps): ReactElement {
	const changed = props.changed ?? true;

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
					eyebrow="Question"
					title={props.title}
					description="Use a full page so field behavior, reporting, and task creation are easy to review."
					backLabel="Back to template"
					onBack={props.onBack}
					actions={props.changed !== undefined ? (
						<CampfireStatusPill tone={changed ? 'ember' : 'green'}>{changed ? 'Unsaved' : 'Saved'}</CampfireStatusPill>
					) : undefined}
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
					<Button type="button" variant="ghost" onClick={props.onBack}>Back</Button>
					<Button type="submit" disabled={props.disabled || !changed}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						Save question
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}
