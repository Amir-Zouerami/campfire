import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import type { StandupTemplate } from '@/types/domain';

import { formatLabel, STANDUP_KINDS, toStandupKind } from './standup-settings.helpers';
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
	const isWeekly = props.draft.kind === 'weekly';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_12rem_12rem]">
				<StandupField htmlFor={`${props.idPrefix}-template`} label="Template">
					<CampfireSelect
						id={`${props.idPrefix}-template`}
						disabled={props.disabled || props.templates.length === 0}
						value={props.draft.templateId}
						onValueChange={value => props.onChange({ templateId: value })}
					>
						<option value="">Choose template</option>
						{props.templates.map(template => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-kind`} label="Kind">
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
								{formatLabel(kind)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-time`} label="Time">
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
						<span>Weekly mode</span>
						<strong>Last working day</strong>
						<small>Weekly standups run on the workspace-local final enabled workday.</small>
					</div>
				)}

				<div className="cf:grid cf:gap-3 cf:xl:grid-cols-3">
					<CampfireCheckboxField
						checked={props.draft.enabled}
						disabled={props.disabled}
						label="Enabled"
						description="Allow this schedule to run."
						onCheckedChange={checked => props.onChange({ enabled: checked })}
					/>

					<CampfireCheckboxField
						checked={props.draft.skipNonWorkingDays}
						disabled={props.disabled}
						label="Skip non-working days"
						description="Do not run on disabled weekdays."
						onCheckedChange={checked => props.onChange({ skipNonWorkingDays: checked })}
					/>

					<CampfireCheckboxField
						checked={props.draft.skipDailyWhenWeeklyRuns}
						disabled={props.disabled}
						label="Skip daily on weekly"
						description="Optional. Weekly can suppress daily, but never by force."
						onCheckedChange={checked => props.onChange({ skipDailyWhenWeeklyRuns: checked })}
					/>
				</div>
			</div>
		</div>
	);
}
