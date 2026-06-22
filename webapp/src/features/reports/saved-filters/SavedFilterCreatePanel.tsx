import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import {
	CampfireResponsiveInput,
	CampfireResponsiveTextarea,
} from '@/components/campfire/CampfireResponsiveInput';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

import {
	savedFilterReportKinds,
	toReportKind,
} from './saved-filters.helpers';
import { savedFilterReportKindLabel } from './saved-filters.i18n';
import { SavedFilterJsonHelpButton } from './SavedFilterJsonHelpButton';
import type {
	SavedFilterDraft,
	SavedFilterDraftPatch,
} from './saved-filters.types';

/**
 * SavedFilterCreatePanelProps contains saved-filter form state and actions.
 */
type SavedFilterCreatePanelProps = {
	readonly draft: SavedFilterDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: SavedFilterDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * SavedFilterCreatePanel renders the create saved-filter form.
 */
export function SavedFilterCreatePanel(
	props: SavedFilterCreatePanelProps,
): ReactElement {
	const { t } = useI18n();

	/**
	 * handleSubmit creates a saved filter.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<form
			className="campfire-flat-work-panel campfire-flat-work-panel--form"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="campfire-page-eyebrow">{t('reports.saved.create.eyebrow')}</p>
				<h3 className="campfire-surface-title">{t('reports.saved.create.title')}</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<CampfireField id="campfire-saved-filter-name" label={t('reports.saved.field.name')}>
					<CampfireResponsiveInput
						id="campfire-saved-filter-name"
						disabled={props.disabled}
						placeholder={t('reports.saved.field.name.placeholder')}
						value={props.draft.name}
						onValueChange={(value) => props.onChange({ name: value })}
					/>
				</CampfireField>

				<CampfireField id="campfire-saved-filter-type" label={t('reports.saved.field.reportType')}>
					<CampfireSelect
						id="campfire-saved-filter-type"
						disabled={props.disabled}
						value={props.draft.reportType}
						onValueChange={(value) =>
							props.onChange({ reportType: toReportKind(value) })
						}
					>
						{savedFilterReportKinds.map((reportKind) => (
							<option key={reportKind} value={reportKind}>
								{savedFilterReportKindLabel(reportKind, t)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<CampfireField
					id="campfire-saved-filter-json"
					label={t('reports.saved.field.filterJson')}
					labelAction={<SavedFilterJsonHelpButton />}
					description={t('reports.saved.field.filterJson.description')}
				>
					<CampfireResponsiveTextarea
						id="campfire-saved-filter-json"
						disabled={props.disabled}
						value={props.draft.filterJson}
						onValueChange={(value) => props.onChange({ filterJson: value })}
					/>
				</CampfireField>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled}>
					<Plus className="cf:size-4" />
					{t('reports.saved.action.save')}
				</Button>
			</div>
		</form>
	);
}
