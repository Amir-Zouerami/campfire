import type { ReactElement } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

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
	const { t } = useI18n();

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
					eyebrow={t('settings.standups.forms.new.eyebrow')}
					title={t('settings.standups.forms.new.title')}
					description={t('settings.standups.forms.new.description')}
					backLabel={t('settings.standups.actions.backToForms')}
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
					<Button type="button" variant="ghost" onClick={props.onBack}>{t('common.cancel')}</Button>
					<Button type="submit" disabled={props.disabled}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
						{t('settings.standups.actions.createTemplate')}
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}
