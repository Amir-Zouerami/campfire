import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { formatLabel, STANDUP_KINDS, toStandupKind } from './standup-settings.helpers';
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
	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem]">
				<StandupField htmlFor={`${props.idPrefix}-name`} label="Template name">
					<Input
						id={`${props.idPrefix}-name`}
						disabled={props.disabled}
						placeholder="Daily standup"
						value={props.draft.name}
						onChange={event => props.onChange({ name: event.currentTarget.value })}
					/>
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
			</div>

			<StandupField htmlFor={`${props.idPrefix}-description`} label="Description">
				<Textarea
					id={`${props.idPrefix}-description`}
					className="cf:min-h-24"
					disabled={props.disabled}
					placeholder="Explain when this form should be used."
					value={props.draft.description}
					onChange={event => props.onChange({ description: event.currentTarget.value })}
				/>
			</StandupField>

			{props.includeActiveToggle && (
				<CampfireCheckboxField
					checked={props.draft.isActive}
					disabled={props.disabled}
					label="Template is active"
					description="Inactive templates remain in history but should not be used for new schedules."
					onCheckedChange={checked => props.onChange({ isActive: checked })}
				/>
			)}
		</div>
	);
}
