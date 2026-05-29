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
 * QuestionReportVisibility is the UI-safe merged visibility control.
 */
type QuestionReportVisibility = 'report' | 'hidden' | 'private';

/**
 * StandupQuestionFieldsProps contains shared question form fields.
 */
type StandupQuestionFieldsProps = {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly allowTemplateChange: boolean;
	readonly hideTemplateField?: boolean;
	readonly onChange: (patch: StandupQuestionDraftPatch) => void;
};

/**
 * StandupQuestionFields renders dynamic-form question controls.
 */
export function StandupQuestionFields(props: StandupQuestionFieldsProps): ReactElement {
	const needsOptions = questionTypeNeedsOptions(props.draft.type);
	const taskCreationSupported = props.draft.type === 'text' || props.draft.type === 'long_text';
	const visibility = questionVisibilityFromDraft(props.draft);

	return (
		<div className="cf:grid cf:gap-4">
			<div className={props.hideTemplateField === true ? 'cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_10rem]' : 'cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem_10rem]'}>
				{props.hideTemplateField !== true && (
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
				)}

				<StandupField htmlFor={`${props.idPrefix}-type`} label="Question type">
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

				<StandupField htmlFor={`${props.idPrefix}-position`} label="Order">
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
				<StandupField htmlFor={`${props.idPrefix}-label`} label="Question text">
					<Input
						id={`${props.idPrefix}-label`}
						disabled={props.disabled}
						placeholder="What did you do last working day?"
						value={props.draft.label}
						onChange={(event) => props.onChange({ label: event.currentTarget.value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-section`} label="Report group">
					<Input
						id={`${props.idPrefix}-section`}
						disabled={props.disabled}
						placeholder="progress"
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
					label="Answer options"
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

			<div className="campfire-question-behavior-grid">
				<StandupField
					htmlFor={`${props.idPrefix}-visibility`}
					label="Report visibility"
					description="Private answers are always hidden from channel reports."
				>
					<CampfireSelect
						id={`${props.idPrefix}-visibility`}
						disabled={props.disabled}
						value={visibility}
						onValueChange={(value) => props.onChange(visibilityPatch(value))}
					>
						<option value="report">Show in channel reports</option>
						<option value="hidden">Hide from reports</option>
						<option value="private">Private answer</option>
					</CampfireSelect>
				</StandupField>

				<CampfireCheckboxField
					checked={props.draft.required}
					disabled={props.disabled}
					label="Required"
					description="Submitters must answer this question."
					onCheckedChange={(checked) => props.onChange({ required: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.createsTasks}
					disabled={props.disabled || !taskCreationSupported}
					label="Create tasks"
					description="Each itemized answer row becomes a task behind the scenes."
					onCheckedChange={(checked) => props.onChange({ createsTasks: checked })}
				/>
			</div>
		</div>
	);
}

/**
 * questionVisibilityFromDraft converts legacy show/private booleans into one UI state.
 */
function questionVisibilityFromDraft(draft: StandupQuestionDraft): QuestionReportVisibility {
	if (draft.isPrivate) {
		return 'private';
	}

	if (draft.showInReport) {
		return 'report';
	}

	return 'hidden';
}

/**
 * visibilityPatch maps the merged visibility control back to persisted booleans.
 */
function visibilityPatch(value: string): StandupQuestionDraftPatch {
	switch (value) {
		case 'private':
			return {
				showInReport: false,
				isPrivate: true,
			};

		case 'hidden':
			return {
				showInReport: false,
				isPrivate: false,
			};

		default:
			return {
				showInReport: true,
				isPrivate: false,
			};
	}
}
