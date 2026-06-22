import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';

import { STANDUP_KINDS, toStandupKind } from './standup-settings.helpers';
import { standupKindLabel } from './standup-settings.i18n';
import type { StandupTemplateDraft, StandupTemplateDraftPatch } from './standup-settings.types';
import { StandupField } from './StandupField';

/**
 * StandupTemplateFieldsProps contains shared template fields.
 */
type StandupTemplateFieldsProps = {
	readonly idPrefix: string;
	readonly draft: StandupTemplateDraft;
	readonly disabled: boolean;
	readonly includeActiveToggle: boolean;
	readonly onChange: (patch: StandupTemplateDraftPatch) => void;
};

/**
 * StandupTemplateFields renders shared template inputs.
 */
export function StandupTemplateFields(props: StandupTemplateFieldsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem]">
				<StandupField htmlFor={`${props.idPrefix}-name`} label={t('settings.standups.fields.templateName')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-name`}
						disabled={props.disabled}
						placeholder={t('settings.standups.fields.templateName.placeholder')}
						value={props.draft.name}
						onValueChange={value => props.onChange({ name: value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-kind`} label={t('settings.standups.fields.kind')}>
					<CampfireSelect
						id={`${props.idPrefix}-kind`}
						disabled={props.disabled}
						value={props.draft.kind}
						onValueChange={value => props.onChange({ kind: toStandupKind(value) })}
					>
						{STANDUP_KINDS.map(kind => (
							<option key={kind} value={kind}>
								{standupKindLabel(t, kind)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>
			</div>

			<StandupField htmlFor={`${props.idPrefix}-description`} label={t('settings.standups.fields.description')}>
				<CampfireResponsiveTextarea
					id={`${props.idPrefix}-description`}
					className="cf:min-h-24"
					disabled={props.disabled}
					placeholder={t('settings.standups.fields.description.placeholder')}
					value={props.draft.description}
					onValueChange={value => props.onChange({ description: value })}
				/>
			</StandupField>

			{props.includeActiveToggle && (
				<CampfireCheckboxField
					checked={props.draft.isActive}
					disabled={props.disabled}
					label={t('settings.standups.fields.templateActive')}
					description={t('settings.standups.fields.templateActive.description')}
					onCheckedChange={checked => props.onChange({ isActive: checked })}
				/>
			)}
		</div>
	);
}
