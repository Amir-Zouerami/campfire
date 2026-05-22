import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { StandupTemplate } from '@/types/domain';

import {
	formatLabel,
	nativeSelectClassName,
	questionTypeNeedsOptions,
	SUPPORTED_QUESTION_TYPES,
	toQuestionType,
} from './standup-settings.helpers';
import type { StandupQuestionDraft, StandupQuestionDraftPatch } from './standup-settings.types';
import { StandupBooleanField } from './StandupBooleanField';
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

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem_10rem]">
				<StandupField htmlFor={`${props.idPrefix}-template`} label="Template">
					<select
						id={`${props.idPrefix}-template`}
						className={nativeSelectClassName()}
						disabled={props.disabled || !props.allowTemplateChange}
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

				<StandupField htmlFor={`${props.idPrefix}-type`} label="Type">
					<select
						id={`${props.idPrefix}-type`}
						className={nativeSelectClassName()}
						disabled={props.disabled}
						value={props.draft.type}
						onChange={event => props.onChange({ type: toQuestionType(event.currentTarget.value) })}
					>
						{SUPPORTED_QUESTION_TYPES.map(type => (
							<option key={type} value={type}>
								{formatLabel(type)}
							</option>
						))}
					</select>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-position`} label="Position">
					<Input
						id={`${props.idPrefix}-position`}
						type="number"
						disabled={props.disabled}
						min={0}
						step={1}
						value={String(props.draft.position)}
						onChange={event =>
							props.onChange({ position: Number.parseInt(event.currentTarget.value, 10) || 0 })
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
						onChange={event => props.onChange({ label: event.currentTarget.value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-section`} label="Section">
					<Input
						id={`${props.idPrefix}-section`}
						disabled={props.disabled}
						placeholder="Yesterday / Today / Blockers"
						value={props.draft.section}
						onChange={event => props.onChange({ section: event.currentTarget.value })}
					/>
				</StandupField>
			</div>

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-2">
				<StandupField htmlFor={`${props.idPrefix}-help`} label="Help text">
					<Input
						id={`${props.idPrefix}-help`}
						disabled={props.disabled}
						placeholder="Short guidance for the submitter."
						value={props.draft.helpText}
						onChange={event => props.onChange({ helpText: event.currentTarget.value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-placeholder`} label="Placeholder">
					<Input
						id={`${props.idPrefix}-placeholder`}
						disabled={props.disabled}
						placeholder="Shown inside the answer control."
						value={props.draft.placeholder}
						onChange={event => props.onChange({ placeholder: event.currentTarget.value })}
					/>
				</StandupField>
			</div>

			{needsOptions && (
				<StandupField
					htmlFor={`${props.idPrefix}-options`}
					label="Options"
					description="Enter one option per line or separate them with commas."
				>
					<Textarea
						id={`${props.idPrefix}-options`}
						className="cf:min-h-28"
						disabled={props.disabled}
						placeholder="Design\nBackend\nReview"
						value={props.draft.optionsText}
						onChange={event => props.onChange({ optionsText: event.currentTarget.value })}
					/>
				</StandupField>
			)}

			<div className="cf:grid cf:gap-3 cf:xl:grid-cols-3">
				<StandupBooleanField
					checked={props.draft.required}
					disabled={props.disabled}
					label="Required"
					description="Submitters must answer this question."
					onChange={checked => props.onChange({ required: checked })}
				/>
				<StandupBooleanField
					checked={props.draft.showInReport}
					disabled={props.disabled}
					label="Show in report"
					description="Include answers in Markdown previews and reports."
					onChange={checked => props.onChange({ showInReport: checked })}
				/>
				<StandupBooleanField
					checked={props.draft.isPrivate}
					disabled={props.disabled}
					label="Private"
					description="Keep this answer out of public reports when supported."
					onChange={checked => props.onChange({ isPrivate: checked })}
				/>
			</div>
		</div>
	);
}
