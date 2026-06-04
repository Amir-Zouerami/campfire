import { memo, startTransition, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/domain';

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
export const MyStandupQuestionField = memo(function MyStandupQuestionField(props: MyStandupQuestionFieldProps): ReactElement {
	const inputID = `campfire-standup-question-${props.question.id}`;

	return (
		<div className="cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4">
			<div className="cf:grid cf:gap-1">
				<Label htmlFor={inputID} className="cf:text-base cf:font-semibold">
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
});

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
				tasks={props.tasks}
				value={questionValueAsString(props.value)}
				onChange={props.onChange}
			/>
		);
	}

	switch (props.question.type) {
		case 'long_text':
			return (
				<CampfireResponsiveTextarea
					id={props.inputID}
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
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
				<CampfireResponsiveInput
					id={props.inputID}
					type="number"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
				/>
			);

		case 'duration':
			return (
				<CampfireResponsiveInput
					id={props.inputID}
					type="number"
					min="0"
					step="5"
					disabled={props.disabled}
					placeholder={props.question.placeholder || 'Minutes'}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
				/>
			);

		case 'text':
		default:
			return (
				<CampfireResponsiveInput
					id={props.inputID}
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
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
						<span className="cf:text-sm cf:font-semibold cf:text-foreground">{option}</span>
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
						<span className="cf:text-sm cf:font-semibold cf:text-foreground">{option}</span>
					</label>
				);
			})}
		</div>
	);
}

/**
 * TaskSearchEntry stores one active task and its normalized title key.
 */
type TaskSearchEntry = {
	readonly task: Task;
	readonly key: string;
};

/**
 * TaskListQuestionControl renders standup work items as editable list rows.
 */
function TaskListQuestionControl(props: {
	readonly inputID: string;
	readonly value: string;
	readonly placeholder: string;
	readonly disabled: boolean;
	readonly tasks: readonly Task[];
	readonly onChange: (value: string) => void;
}): ReactElement {
	const [draftItems, setDraftItems] = useState<readonly string[]>(() => {
		const items = parseTaskListItems(props.value);
		return items.length > 0 ? editableTaskItems(items) : [''];
	});
	const lastEmittedValueRef = useRef(props.value);
	const previousInputIDRef = useRef(props.inputID);
	const taskSearchEntries = useMemo(() => buildTaskSearchEntries(props.tasks), [props.tasks]);
	const exactTaskByKey = useMemo(() => buildExactTaskByKey(taskSearchEntries), [taskSearchEntries]);

	useEffect(() => {
		const inputChanged = previousInputIDRef.current !== props.inputID;
		previousInputIDRef.current = props.inputID;

		if (!inputChanged && props.value === lastEmittedValueRef.current) {
			return;
		}

		const items = parseTaskListItems(props.value);
		lastEmittedValueRef.current = props.value;
		setDraftItems(editableTaskItems(items));
	}, [props.inputID, props.value]);

	function commitItems(nextItems: readonly string[]): void {
		const editableItems = editableTaskItems(nextItems);
		const formattedValue = formatTaskListValue(editableItems);

		lastEmittedValueRef.current = formattedValue;
		setDraftItems(editableItems);
		startTransition(() => {
			props.onChange(formattedValue);
		});
	}

	function updateItem(index: number, nextValue: string): void {
		const nextItems = [...draftItems];
		nextItems[index] = nextValue;
		commitItems(nextItems);
	}

	function handleItemKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number): void {
		event.stopPropagation();

		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();

		if (draftItems[index]?.trim() === '') {
			return;
		}

		commitItems([...draftItems, '']);
	}

	function addItem(): void {
		setDraftItems(current => [...current, '']);
	}

	function removeItem(index: number): void {
		const nextItems = draftItems.filter((_, currentIndex) => currentIndex !== index);
		commitItems(nextItems.length > 0 ? nextItems : ['']);
	}

	function selectExistingTask(index: number, title: string): void {
		updateItem(index, title);
	}

	return (
		<div className="cf:grid cf:gap-3">
			<div className="cf:grid cf:gap-2">
				{draftItems.map((item, index) => {
					const suggestions = matchingTasks(taskSearchEntries, item);
					const exactMatch = exactMatchingTask(exactTaskByKey, item);

					return (
						<div
							key={`${props.inputID}-${index}`}
							className="campfire-work-item-row cf:grid cf:grid-cols-[2.25rem_minmax(0,1fr)_auto] cf:items-start cf:gap-2"
						>
							<div className="campfire-work-item-index cf:flex cf:h-10 cf:w-9 cf:items-center cf:justify-center cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/20 cf:text-sm cf:font-semibold cf:text-amber-100">
								{index + 1}
							</div>

							<div className="campfire-work-item-input-wrap">
								<Input
									id={index === 0 ? props.inputID : undefined}
									disabled={props.disabled}
									placeholder={props.placeholder || 'Add one work item'}
									value={item}
									onChange={event => updateItem(index, event.currentTarget.value)}
									onKeyDown={event => handleItemKeyDown(event, index)}
								/>

								{exactMatch !== null && (
									<p className="campfire-task-match-hint">
										<CheckCircle2 className="cf:size-4" /> Existing task selected
									</p>
								)}

								{suggestions.length > 0 && exactMatch === null && (
									<div className="campfire-task-suggestion-list" role="listbox" aria-label="Matching existing tasks">
										{suggestions.map(task => (
											<button
												key={task.id}
												type="button"
												tabIndex={-1}
												className="campfire-task-suggestion"
												onMouseDown={event => {
													event.preventDefault();
													selectExistingTask(index, task.title);
												}}
											>
												<span>{task.title}</span>
												<small>{task.status}</small>
											</button>
										))}
									</div>
								)}
							</div>

							<Button
								type="button"
								variant="secondary"
								tabIndex={-1}
								disabled={props.disabled || draftItems.length === 1}
								onClick={() => removeItem(index)}
							>
								<Trash2 className="cf:size-4" />
								Remove
							</Button>
						</div>
					);
				})}
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Start typing and Campfire opens the next row automatically. Use suggestions to reuse existing tasks.
				</p>

				<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => addItem()}>
					<Plus className="cf:size-4" />
					Add item
				</Button>
			</div>
		</div>
	);
}

/**
 * editableTaskItems removes blank draft rows while preserving the exact text a
 * user is typing in non-empty rows. Task uniqueness still uses normalized title
 * keys, but the editor must not trim an in-progress row because that prevents
 * typing spaces between words.
 */
function editableTaskItems(items: readonly string[]): readonly string[] {
	const filledItems = items.filter(item => item.trim() !== '');

	return [...filledItems, ''];
}

/**
 * buildTaskSearchEntries pre-normalizes active task titles once per task list.
 */
function buildTaskSearchEntries(tasks: readonly Task[]): readonly TaskSearchEntry[] {
	return tasks
		.filter(task => task.status !== 'archived')
		.map(task => ({
			task,
			key: normalizeTaskTitleKey(task.title),
		}))
		.filter(entry => entry.key !== '');
}

/**
 * buildExactTaskByKey builds O(1) exact-match lookup for task suggestions.
 */
function buildExactTaskByKey(entries: readonly TaskSearchEntry[]): ReadonlyMap<string, Task> {
	const tasksByKey = new Map<string, Task>();

	for (const entry of entries) {
		if (!tasksByKey.has(entry.key)) {
			tasksByKey.set(entry.key, entry.task);
		}
	}

	return tasksByKey;
}

/**
 * matchingTasks returns a small list of active matching task suggestions.
 */
function matchingTasks(entries: readonly TaskSearchEntry[], value: string): readonly Task[] {
	const query = normalizeTaskTitleKey(value);
	if (query.length < 2) {
		return [];
	}

	const matches: Task[] = [];

	for (const entry of entries) {
		if (!entry.key.includes(query)) {
			continue;
		}

		matches.push(entry.task);

		if (matches.length >= 6) {
			break;
		}
	}

	return matches;
}

/**
 * exactMatchingTask returns the task whose title matches the current row exactly.
 */
function exactMatchingTask(tasksByKey: ReadonlyMap<string, Task>, value: string): Task | null {
	const key = normalizeTaskTitleKey(value);
	if (key === '') {
		return null;
	}

	return tasksByKey.get(key) ?? null;
}

/**
 * normalizeTaskTitleKey compares task titles the same way as the backend.
 */
function normalizeTaskTitleKey(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
