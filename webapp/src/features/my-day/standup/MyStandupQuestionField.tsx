import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
	nextMultiSelectValue,
	questionValueAsBoolean,
	questionValueAsList,
	questionValueAsString,
} from './my-standup.helpers';
import type { MyStandupQuestionFieldProps } from './my-standup.types';

/**
 * MyStandupQuestionField renders one dynamic standup question.
 */
export function MyStandupQuestionField(props: MyStandupQuestionFieldProps): ReactElement {
	const inputID = `campfire-standup-question-${props.question.id}`;

	return (
		<div className="cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4">
			<div className="cf:grid cf:gap-1">
				<Label htmlFor={inputID} className="cf:text-base cf:font-black">
					{props.question.label}
					{props.question.required && <span className="cf:ml-1 cf:text-amber-200">*</span>}
				</Label>

				{props.question.helpText.trim() !== '' && (
					<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{props.question.helpText}
					</p>
				)}
			</div>

			<QuestionControl {...props} inputID={inputID} />
		</div>
	);
}

/**
 * QuestionControl renders the input control for a question type.
 */
function QuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	switch (props.question.type) {
		case 'long_text':
			return (
				<Textarea
					id={props.inputID}
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'checkbox':
			return <CheckboxQuestionControl {...props} />;

		case 'boolean':
			return (
				<CampfireCheckboxField
					checked={questionValueAsBoolean(props.value)}
					label="Yes"
					disabled={props.disabled}
					onCheckedChange={checked => props.onChange(checked)}
				/>
			);

		case 'dropdown':
			return (
				<CampfireSelect
					id={props.inputID}
					disabled={props.disabled}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
				>
					<option value="">Choose…</option>
					{props.question.options.map(option => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</CampfireSelect>
			);

		case 'multi_select':
			return <MultiSelectQuestionControl {...props} />;

		case 'number':
			return (
				<Input
					id={props.inputID}
					type="number"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'duration':
			return (
				<Input
					id={props.inputID}
					type="number"
					min={0}
					disabled={props.disabled}
					placeholder={props.question.placeholder || 'Minutes'}
					value={questionValueAsString(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'text':
		default:
			return (
				<Input
					id={props.inputID}
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);
	}
}

/**
 * CheckboxQuestionControl renders checkbox questions with or without options.
 */
function CheckboxQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	if (props.question.options.length === 0) {
		return (
			<CampfireCheckboxField
				checked={questionValueAsBoolean(props.value)}
				label="Checked"
				disabled={props.disabled}
				onCheckedChange={checked => props.onChange(checked)}
			/>
		);
	}

	return (
		<div id={props.inputID} className="cf:grid cf:gap-2">
			{props.question.options.map(option => (
				<CampfireCheckboxField
					key={option}
					checked={questionValueAsList(props.value).includes(option)}
					label={option}
					disabled={props.disabled}
					onCheckedChange={checked => props.onChange(nextMultiSelectValue(props.value, option, checked))}
				/>
			))}
		</div>
	);
}

/**
 * MultiSelectQuestionControl renders a multi-select question as a checkbox group.
 */
function MultiSelectQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	if (props.question.options.length === 0) {
		return (
			<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-amber-300/20 cf:bg-amber-950/20 cf:p-3 cf:text-sm cf:font-bold cf:text-amber-100">
				This question has no configured options.
			</p>
		);
	}

	return (
		<div id={props.inputID} className="cf:grid cf:gap-2">
			{props.question.options.map(option => {
				const checked = questionValueAsList(props.value).includes(option);

				return (
					<button
						key={option}
						type="button"
						disabled={props.disabled}
						className={cn(
							'cf:flex cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-left cf:text-sm cf:font-black cf:transition',
							checked
								? 'cf:border-emerald-300/30 cf:bg-emerald-300/10 cf:text-emerald-100'
								: 'cf:border-white/10 cf:bg-black/20 cf:text-muted-foreground hover:cf:border-amber-300/25 hover:cf:text-foreground',
							props.disabled && 'cf:cursor-not-allowed cf:opacity-60',
						)}
						onClick={() => props.onChange(nextMultiSelectValue(props.value, option, !checked))}
					>
						<span>{option}</span>
						<span>{checked ? 'Selected' : 'Select'}</span>
					</button>
				);
			})}
		</div>
	);
}
