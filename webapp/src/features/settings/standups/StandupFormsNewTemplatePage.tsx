import type { ReactElement } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';

import type { StandupTemplateDraft, StandupTemplateDraftPatch } from './standup-settings.types';
import { StandupFormsPageHeader } from './StandupFormsPageHeader';
import { StandupTemplateFields } from './StandupTemplateFields';

/**
 * StandupFormsNewTemplatePageProps contains create-template editor state.
 */
type StandupFormsNewTemplatePageProps = {
	readonly draft: StandupTemplateDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (patch: StandupTemplateDraftPatch) => void;
	readonly onCreateTemplate: () => Promise<void>;
};

/**
 * StandupFormsNewTemplatePage renders the full-page template creation flow.
 */
export function StandupFormsNewTemplatePage(props: StandupFormsNewTemplatePageProps): ReactElement {
	return (
		<CampfireSurface className="campfire-standup-editor-surface campfire-standup-editor-surface--hero">
			<form
				className="campfire-standup-editor-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onCreateTemplate();
				}}
			>
				<StandupFormsPageHeader
					eyebrow="New template"
					title="Create a standup form"
					description="Start with the form name and cadence. Add questions after the template is created."
					backLabel="Back to forms"
					onBack={props.onBack}
				/>

				<StandupTemplateFields
					idPrefix="campfire-new-standup-template"
					draft={props.draft}
					disabled={props.disabled}
					includeActiveToggle={false}
					onChange={props.onDraftChange}
				/>

				<div className="campfire-form-actions campfire-form-actions--split">
					<Button type="button" variant="ghost" onClick={props.onBack}>Cancel</Button>
					<Button type="submit" disabled={props.disabled}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
						Create template
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}
