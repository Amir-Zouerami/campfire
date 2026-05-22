import type { ReactElement } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
	nextMultiSelectValue,
	questionValueAsBoolean,
	questionValueAsList,
	questionValueAsString,
	selectClassName,
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
		case 'boolean':
			return (
				<label
					htmlFor={props.inputID}
					className="cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/20 cf:px-4 cf:py-3"
				>
					<Checkbox
						id={props.inputID}
						disabled={props.disabled}
						checked={questionValueAsBoolean(props.value)}
						onCheckedChange={checked => props.onChange(checked === true)}
					/>
					<span className="cf:text-sm cf:font-bold cf:text-foreground">
						{props.question.placeholder.trim() === '' ? 'Yes' : props.question.placeholder}
					</span>
				</label>
			);

		case 'dropdown':
			return (
				<select
					id={props.inputID}
					className={selectClassName()}
					disabled={props.disabled}
					value={questionValueAsString(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				>
					<option value="">Choose…</option>
					{props.question.options.map(option => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			);

		case 'multi_select':
			return (
				<div className="cf:grid cf:gap-2">
					{props.question.options.map(option => {
						const selected = questionValueAsList(props.value).includes(option);

						return (
							<label
								key={option}
								className={cn(
									'cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-xl cf:border cf:px-4 cf:py-3 cf:transition',
									selected
										? 'cf:border-amber-300/35 cf:bg-amber-300/10'
										: 'cf:border-white/10 cf:bg-black/20 hover:cf:border-amber-300/25',
								)}
							>
								<Checkbox
									disabled={props.disabled}
									checked={selected}
									onCheckedChange={checked => {
										props.onChange(nextMultiSelectValue(props.value, option, checked === true));
									}}
								/>
								<span className="cf:text-sm cf:font-bold cf:text-foreground">{option}</span>
							</label>
						);
					})}
				</div>
			);

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
					min="0"
					step="5"
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
