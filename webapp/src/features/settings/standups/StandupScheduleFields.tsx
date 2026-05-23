import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import type { StandupTemplate } from '@/types/domain';

import {
	formatLabel,
	nativeSelectClassName,
	STANDUP_KINDS,
	toStandupKind,
	toWeeklyMode,
	WEEKLY_MODES,
} from './standup-settings.helpers';
import type { StandupScheduleDraft, StandupScheduleDraftPatch } from './standup-settings.types';
import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { StandupField } from './StandupField';

/**
 * StandupScheduleFieldsProps contains shared schedule form fields.
 */
type StandupScheduleFieldsProps = {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupScheduleDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: StandupScheduleDraftPatch) => void;
};

/**
 * StandupScheduleFields renders schedule inputs shared by create and edit forms.
 */
export function StandupScheduleFields(props: StandupScheduleFieldsProps): ReactElement {
	const isWeekly = props.draft.kind === 'weekly';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem_12rem]">
				<StandupField htmlFor={`${props.idPrefix}-template`} label="Template">
					<select
						id={`${props.idPrefix}-template`}
						className={nativeSelectClassName()}
						disabled={props.disabled}
						value={props.draft.templateId}
						onChange={event => props.onChange({ templateId: event.currentTarget.value })}
					>
						<option value="">Choose template</option>
						{props.templates.map(template => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</select>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-kind`} label="Kind">
					<select
						id={`${props.idPrefix}-kind`}
						className={nativeSelectClassName()}
						disabled={props.disabled}
						value={props.draft.kind}
						onChange={event => props.onChange({ kind: toStandupKind(event.currentTarget.value) })}
					>
						{STANDUP_KINDS.map(kind => (
							<option key={kind} value={kind}>
								{formatLabel(kind)}
							</option>
						))}
					</select>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-time`} label="Time">
					<Input
						id={`${props.idPrefix}-time`}
						type="time"
						disabled={props.disabled}
						value={props.draft.timeOfDay}
						onChange={event => props.onChange({ timeOfDay: event.currentTarget.value })}
					/>
				</StandupField>
			</div>

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[18rem_1fr]">
				<StandupField
					htmlFor={`${props.idPrefix}-weekly-mode`}
					label="Weekly mode"
					description="Only applies when kind is Weekly."
				>
					<select
						id={`${props.idPrefix}-weekly-mode`}
						className={nativeSelectClassName()}
						disabled={props.disabled || !isWeekly}
						value={isWeekly ? props.draft.weeklyMode || 'none' : 'none'}
						onChange={event => props.onChange({ weeklyMode: toWeeklyMode(event.currentTarget.value) })}
					>
						{WEEKLY_MODES.map(mode => (
							<option key={mode} value={mode}>
								{formatLabel(mode)}
							</option>
						))}
					</select>
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
