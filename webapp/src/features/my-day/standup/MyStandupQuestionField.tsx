import { useEffect, useState, type ReactElement } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
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
} from './my-standup.helpers';
import type { MyStandupQuestionFieldProps } from './my-standup.types';
import { formatTaskListValue, isTaskListQuestion, parseTaskListItems } from './standup-task-list.helpers';

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
	if (isTaskListQuestion(props.question)) {
		return (
			<TaskListQuestionControl
				disabled={props.disabled}
				inputID={props.inputID}
				placeholder={props.question.placeholder}
				value={questionValueAsString(props.value)}
				onChange={props.onChange}
			/>
		);
	}

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
					label={props.question.placeholder.trim() === '' ? 'Yes' : props.question.placeholder}
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

/**
 * CheckboxQuestionControl renders checkbox option questions.
 */
function CheckboxQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	const options = props.question.options.length > 0 ? props.question.options : ['Yes'];

	return (
		<div className="cf:grid cf:gap-2">
			{options.map(option => {
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
}

/**
 * MultiSelectQuestionControl renders multi-select option questions.
 */
function MultiSelectQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
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
}

/**
 * TaskListQuestionControl renders standup work items as editable list rows instead of one blob textarea.
 */
function TaskListQuestionControl(props: {
	readonly inputID: string;
	readonly value: string;
	readonly placeholder: string;
	readonly disabled: boolean;
	readonly onChange: (value: string) => void;
}): ReactElement {
	const [draftItems, setDraftItems] = useState<readonly string[]>(() => {
		const items = parseTaskListItems(props.value);
		return items.length > 0 ? items : [''];
	});

	useEffect(() => {
		const items = parseTaskListItems(props.value);
		setDraftItems(items.length > 0 ? items : ['']);
	}, [props.inputID, props.value]);

	/**
	 * commitItems updates local and parent value.
	 */
	function commitItems(nextItems: readonly string[]): void {
		setDraftItems(nextItems.length > 0 ? nextItems : ['']);
		props.onChange(formatTaskListValue(nextItems));
	}

	/**
	 * updateItem changes one list row.
	 */
	function updateItem(index: number, nextValue: string): void {
		const nextItems = [...draftItems];
		nextItems[index] = nextValue;
		commitItems(nextItems);
	}

	/**
	 * addItem appends one empty row.
	 */
	function addItem(): void {
		setDraftItems(current => [...current, '']);
	}

	/**
	 * removeItem removes one row.
	 */
	function removeItem(index: number): void {
		const nextItems = draftItems.filter((_, currentIndex) => currentIndex !== index);
		commitItems(nextItems.length > 0 ? nextItems : ['']);
	}

	return (
		<div className="cf:grid cf:gap-3">
			<div className="cf:grid cf:gap-2">
				{draftItems.map((item, index) => (
					<div
						key={`${props.inputID}-${index}`}
						className="cf:grid cf:grid-cols-[2.25rem_minmax(0,1fr)_auto] cf:items-center cf:gap-2"
					>
						<div className="cf:flex cf:h-10 cf:w-9 cf:items-center cf:justify-center cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/20 cf:text-sm cf:font-black cf:text-amber-100">
							{index + 1}
						</div>

						<Input
							id={index === 0 ? props.inputID : undefined}
							disabled={props.disabled}
							placeholder={props.placeholder || 'Add one work item'}
							value={item}
							onChange={event => updateItem(index, event.currentTarget.value)}
						/>

						<Button
							type="button"
							variant="secondary"
							disabled={props.disabled || draftItems.length === 1}
							onClick={() => removeItem(index)}
						>
							<Trash2 className="cf:size-4" />
							Remove
						</Button>
					</div>
				))}
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Each row becomes a Markdown bullet and can be synced into Time Log as a task.
				</p>

				<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => addItem()}>
					<Plus className="cf:size-4" />
					Add item
				</Button>
			</div>
		</div>
	);
}
