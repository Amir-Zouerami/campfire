import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import type { StandupTemplate } from '@/types/domain';

import { formatLabel, STANDUP_KINDS, toStandupKind, toWeeklyMode, WEEKLY_MODES } from './standup-settings.helpers';
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
	const weeklyModeValue = props.draft.weeklyMode === '' ? 'none' : props.draft.weeklyMode;

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
						onValueChange={value => props.onChange({ kind: toStandupKind(value) })}
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

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[14rem_1fr]">
				<StandupField
					htmlFor={`${props.idPrefix}-weekly-mode`}
					label="Weekly mode"
					description="Only applies when kind is Weekly."
				>
					<CampfireSelect
						id={`${props.idPrefix}-weekly-mode`}
						disabled={props.disabled || !isWeekly}
						value={weeklyModeValue}
						onValueChange={value => props.onChange({ weeklyMode: toWeeklyMode(value) })}
					>
						{WEEKLY_MODES.map(mode => (
							<option key={mode} value={mode}>
								{mode === 'none' ? 'None' : formatLabel(mode)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

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
