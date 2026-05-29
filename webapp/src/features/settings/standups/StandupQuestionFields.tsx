import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { StandupTemplate } from '@/types/domain';

import {
	formatLabel,
	questionTypeNeedsOptions,
	SUPPORTED_QUESTION_TYPES,
	toQuestionType,
} from './standup-settings.helpers';
import type { StandupQuestionDraft, StandupQuestionDraftPatch } from './standup-settings.types';
import { StandupField } from './StandupField';

/**
 * StandupQuestionFieldsProps contains shared question form fields.
 */
type StandupQuestionFieldsProps = {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly allowTemplateChange: boolean;
	readonly onChange: (patch: StandupQuestionDraftPatch) => void;
};

/**
 * StandupQuestionFields renders dynamic-form question controls.
 */
export function StandupQuestionFields(props: StandupQuestionFieldsProps): ReactElement {
	const needsOptions = questionTypeNeedsOptions(props.draft.type);
	const taskCreationSupported = props.draft.type === 'text' || props.draft.type === 'long_text';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem_10rem]">
				<StandupField htmlFor={`${props.idPrefix}-template`} label="Template">
					<CampfireSelect
						id={`${props.idPrefix}-template`}
						disabled={props.disabled || !props.allowTemplateChange}
						value={props.draft.templateId}
						onValueChange={(value) => props.onChange({ templateId: value })}
					>
						<option value="">Choose template</option>
						{props.templates.map((template) => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-type`} label="Type">
					<CampfireSelect
						id={`${props.idPrefix}-type`}
						disabled={props.disabled}
						value={props.draft.type}
						onValueChange={(value) => {
							const nextType = toQuestionType(value);
							props.onChange({
								type: nextType,
								createsTasks: nextType === 'text' || nextType === 'long_text' ? props.draft.createsTasks : false,
							});
						}}
					>
						{SUPPORTED_QUESTION_TYPES.map((type) => (
							<option key={type} value={type}>
								{formatLabel(type)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-position`} label="Position">
					<Input
						id={`${props.idPrefix}-position`}
						type="number"
						disabled={props.disabled}
						min={0}
						step={1}
						value={String(props.draft.position)}
						onChange={(event) =>
							props.onChange({
								position: Number.parseInt(event.currentTarget.value, 10) || 0,
							})
						}
					/>
				</StandupField>
			</div>

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_18rem]">
				<StandupField htmlFor={`${props.idPrefix}-label`} label="Question label">
					<Input
						id={`${props.idPrefix}-label`}
						disabled={props.disabled}
						placeholder="What did you work on yesterday?"
						value={props.draft.label}
						onChange={(event) => props.onChange({ label: event.currentTarget.value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-section`} label="Section">
					<Input
						id={`${props.idPrefix}-section`}
						disabled={props.disabled}
						placeholder="general"
						value={props.draft.section}
						onChange={(event) => props.onChange({ section: event.currentTarget.value })}
					/>
				</StandupField>
			</div>

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-2">
				<StandupField htmlFor={`${props.idPrefix}-help`} label="Help text">
					<Input
						id={`${props.idPrefix}-help`}
						disabled={props.disabled}
						placeholder="Optional helper text for submitters."
						value={props.draft.helpText}
						onChange={(event) => props.onChange({ helpText: event.currentTarget.value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-placeholder`} label="Placeholder">
					<Input
						id={`${props.idPrefix}-placeholder`}
						disabled={props.disabled}
						placeholder="Optional input placeholder."
						value={props.draft.placeholder}
						onChange={(event) => props.onChange({ placeholder: event.currentTarget.value })}
					/>
				</StandupField>
			</div>

			{needsOptions && (
				<StandupField
					htmlFor={`${props.idPrefix}-options`}
					label="Options"
					description="One option per line. Empty and duplicate rows are ignored."
				>
					<Textarea
						id={`${props.idPrefix}-options`}
						className="cf:min-h-28"
						disabled={props.disabled}
						placeholder="Option one&#10;Option two&#10;Option three"
						value={props.draft.optionsText}
						onChange={(event) => props.onChange({ optionsText: event.currentTarget.value })}
					/>
				</StandupField>
			)}

			<div className="cf:grid cf:gap-3 cf:xl:grid-cols-4">
				<CampfireCheckboxField
					checked={props.draft.required}
					disabled={props.disabled}
					label="Required"
					description="Submitters must answer this question."
					onCheckedChange={(checked) => props.onChange({ required: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.showInReport}
					disabled={props.disabled}
					label="Show in report"
					description="Include answers in Markdown previews and reports."
					onCheckedChange={(checked) => props.onChange({ showInReport: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.isPrivate}
					disabled={props.disabled}
					label="Private"
					description="Keep this answer out of public reports when supported."
					onCheckedChange={(checked) => props.onChange({ isPrivate: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.createsTasks}
					disabled={props.disabled || !taskCreationSupported}
					label="Create tasks"
					description="Each answer row becomes a task behind the scenes."
					onCheckedChange={(checked) => props.onChange({ createsTasks: checked })}
				/>
			</div>
		</div>
	);
}
