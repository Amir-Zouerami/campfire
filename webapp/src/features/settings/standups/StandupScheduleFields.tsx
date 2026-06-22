import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { useI18n } from '@/i18n';
import type { StandupTemplate } from '@/types/domain';

import { STANDUP_KINDS, toStandupKind } from './standup-settings.helpers';
import { standupKindLabel } from './standup-settings.i18n';
import type { StandupScheduleDraft, StandupScheduleDraftPatch } from './standup-settings.types';
import { StandupField } from './StandupField';

/**
 * StandupScheduleFieldsProps contains shared schedule fields.
 */
type StandupScheduleFieldsProps = {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupScheduleDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: StandupScheduleDraftPatch) => void;
};

/**
 * StandupScheduleFields renders shared schedule form fields.
 */
export function StandupScheduleFields(props: StandupScheduleFieldsProps): ReactElement {
	const { t } = useI18n();
	const isWeekly = props.draft.kind === 'weekly';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="campfire-standup-schedule-field-grid">
				<StandupField htmlFor={`${props.idPrefix}-template`} label={t('settings.standups.fields.template')}>
					<CampfireSelect
						id={`${props.idPrefix}-template`}
						disabled={props.disabled || props.templates.length === 0}
						value={props.draft.templateId}
						onValueChange={value => props.onChange({ templateId: value })}
					>
						<option value="">{t('settings.standups.fields.template.placeholder')}</option>
						{props.templates.map(template => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-kind`} label={t('settings.standups.fields.kind')}>
					<CampfireSelect
						id={`${props.idPrefix}-kind`}
						disabled={props.disabled}
						value={props.draft.kind}
						onValueChange={value => {
							const kind = toStandupKind(value);
							props.onChange({
								kind,
								weeklyMode: kind === 'weekly' ? 'last_working_day' : 'none',
							});
						}}
					>
						{STANDUP_KINDS.map(kind => (
							<option key={kind} value={kind}>
								{standupKindLabel(t, kind)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-opens`} label={t('settings.standups.fields.opens')}>
					<CampfireTimeInput
						id={`${props.idPrefix}-opens`}
						disabled={props.disabled}
						value={props.draft.opensAt}
						onValueChange={value => props.onChange({ opensAt: value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-time`} label={t('settings.standups.fields.closesReport')}>
					<CampfireTimeInput
						id={`${props.idPrefix}-time`}
						disabled={props.disabled}
						value={props.draft.timeOfDay}
						onValueChange={value => props.onChange({ timeOfDay: value })}
					/>
				</StandupField>
			</div>

			<div className="cf:grid cf:gap-4">
				{isWeekly && (
					<div className="campfire-static-field">
						<span>{t('settings.standups.fields.weeklyMode')}</span>
						<strong>{t('settings.standups.fields.weeklyMode.lastWorkingDay')}</strong>
						<small>{t('settings.standups.fields.weeklyMode.description')}</small>
					</div>
				)}

				<div className="cf:grid cf:gap-3 cf:xl:grid-cols-2">
					<CampfireCheckboxField
						checked={props.draft.enabled}
						disabled={props.disabled}
						label={t('settings.standups.fields.enabled')}
						description={t('settings.standups.fields.enabled.description')}
						onCheckedChange={checked => props.onChange({ enabled: checked })}
					/>

					<CampfireCheckboxField
						checked={props.draft.skipNonWorkingDays}
						disabled={props.disabled}
						label={t('settings.standups.fields.skipNonWorkingDays')}
						description={t('settings.standups.fields.skipNonWorkingDays.description')}
						onCheckedChange={checked => props.onChange({ skipNonWorkingDays: checked })}
					/>
				</div>
			</div>
		</div>
	);
}
