import { memo, startTransition, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireFormQuestionCard } from '@/components/campfire/CampfireFormQuestionCard';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { useI18n } from '@/i18n';
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
	const direction = textDirectionFor([
		props.question.label,
		props.question.helpText,
		props.question.placeholder,
		...props.question.options,
	]);

	return (
		<CampfireFormQuestionCard
			id={inputID}
			label={props.question.label}
			required={props.question.required}
			description={visibleQuestionHelpText(props.question.helpText)}
			className={cn(direction === 'rtl' && 'campfire-form-question-card--rtl')}
		>
			<QuestionControl {...props} inputID={inputID} />
		</CampfireFormQuestionCard>
	);
});


/**
 * visibleQuestionHelpText removes legacy noisy helper copy from default task-list questions.
 */
function visibleQuestionHelpText(value: string): string {
	const cleanValue = value.trim();
	const normalized = cleanValue.toLowerCase();

	if (normalized.includes('start typing') && normalized.includes('campfire opens')) {
		return '';
	}

	if (normalized.includes('use suggestions') && normalized.includes('reuse existing tasks')) {
		return '';
	}

	return cleanValue;
}


/**
 * textDirectionFor returns rtl only when Persian/Arabic content is the dominant
 * user-facing text. Mixed content still uses dir=auto on the text node itself.
 */
function textDirectionFor(values: readonly string[]): 'ltr' | 'rtl' {
	let rtlCount = 0;
	let latinCount = 0;

	for (const value of values) {
		for (const character of value) {
			if (/\p{Script=Arabic}/u.test(character)) {
				rtlCount += 1;
			} else if (/[A-Za-z]/u.test(character)) {
				latinCount += 1;
			}
		}
	}

	return rtlCount > 0 && rtlCount >= latinCount ? 'rtl' : 'ltr';
}

/**
 * QuestionControl renders the input control for a question type.
 */
function QuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	const { t } = useI18n();

	if (isTaskListQuestion(props.question)) {
		return (
			<TaskListQuestionControl
				disabled={props.disabled}
				inputID={props.inputID}
				placeholder={props.question.placeholder || t('myDay.standup.question.workItems.placeholder')}
				tasks={props.tasks}
				value={questionValueAsString(props.value)}
				onChange={props.onChange}
			/>
		);
	}

	const questionType = normalizedQuestionType(props.question.type);

	switch (questionType) {
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
			return <BooleanQuestionControl {...props} />;

		case 'dropdown':
			return (
				<CampfireSelect
					id={props.inputID}
					disabled={props.disabled}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
				>
					<option value="">{t('myDay.standup.question.dropdown.placeholder')}</option>
					{props.question.options.map(option => (
						<option key={option} value={option}>
							<CampfireBidiText className="campfire-standup-option-label">{option}</CampfireBidiText>
						</option>
					))}
				</CampfireSelect>
			);

		case 'multi_select':
			return <MultiSelectQuestionControl {...props} />;

		case 'date':
			return (
				<CampfireDateInput
					id={props.inputID}
					disabled={props.disabled}
					value={questionValueAsString(props.value)}
					timezone={props.timezone}
					onValueChange={value => props.onChange(value)}
				/>
			);

		case 'time':
			return (
				<CampfireTimeInput
					id={props.inputID}
					disabled={props.disabled}
					value={questionValueAsString(props.value)}
					onValueChange={value => props.onChange(value)}
				/>
			);

		case 'datetime':
			return <DateTimeQuestionControl {...props} />;

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
					placeholder={props.question.placeholder || t('myDay.standup.question.duration.placeholder')}
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
 * normalizedQuestionType accepts API-safe values and protects the runtime from
 * older rows or UI drafts that accidentally store display labels such as
 * "Boolean" instead of the lowercase enum value.
 */
function normalizedQuestionType(value: string): string {
	switch (value.trim().toLowerCase()) {
		case 'long_text':
		case 'long text':
			return 'long_text';

		case 'multi_select':
		case 'multi select':
			return 'multi_select';

		case 'checkbox':
		case 'boolean':
		case 'dropdown':
		case 'number':
		case 'duration':
		case 'work_items':
		case 'date':
		case 'time':
		case 'datetime':
		case 'text':
			return value.trim().toLowerCase();

		default:
			return 'text';
	}
}


/**
 * DateTimeQuestionControl renders one date-time answer as coordinated Campfire
 * date and time pickers while storing one API-safe YYYY-MM-DDTHH:mm string.
 */
function DateTimeQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	const value = questionValueAsString(props.value);
	const [initialDateValue, initialTimeValue] = splitDateTimeValue(value);
	const [dateDraft, setDateDraft] = useState(initialDateValue);
	const [timeDraft, setTimeDraft] = useState(initialTimeValue);

	useEffect(() => {
		const [nextDateValue, nextTimeValue] = splitDateTimeValue(questionValueAsString(props.value));
		setDateDraft(nextDateValue);
		setTimeDraft(nextTimeValue);
	}, [props.inputID, props.value]);

	function commit(nextDate: string, nextTime: string): void {
		if (nextDate.trim() === '' || nextTime.trim() === '') {
			props.onChange('');
			return;
		}

		props.onChange(`${nextDate}T${nextTime}`);
	}

	function handleDateChange(nextDate: string): void {
		setDateDraft(nextDate);
		commit(nextDate, timeDraft);
	}

	function handleTimeChange(nextTime: string): void {
		setTimeDraft(nextTime);
		commit(dateDraft, nextTime);
	}

	return (
		<div className="cf:grid cf:gap-3 md:cf:grid-cols-2">
			<CampfireDateInput
				id={`${props.inputID}-date`}
				disabled={props.disabled}
				value={dateDraft}
				timezone={props.timezone}
				onValueChange={handleDateChange}
			/>

			<CampfireTimeInput
				id={`${props.inputID}-time`}
				disabled={props.disabled}
				value={timeDraft}
				onValueChange={handleTimeChange}
			/>
		</div>
	);
}

/**
 * splitDateTimeValue safely separates a local date-time answer.
 */
function splitDateTimeValue(value: string): readonly [string, string] {
	const [dateValue = '', timeValue = ''] = value.split('T');

	return [dateValue, timeValue];
}

/**
 * BooleanQuestionControl renders true/false questions as a first-class answer
 * control. It intentionally does not use CampfireSelect; a boolean question is
 * not an option picker and must not show a fake "Choose option" row.
 */
function BooleanQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	const { t } = useI18n();
	const selectedValue = questionValueAsBoolean(props.value);
	const labels = booleanOptionLabels(props.question.options, t('common.no'), t('common.yes'));
	const direction = textDirectionFor([props.question.label, labels.falseLabel, labels.trueLabel]);

	return (
		<div
			className={cn('campfire-boolean-answer-control', direction === 'rtl' && 'campfire-boolean-answer-control--rtl')}
			role="radiogroup"
			aria-labelledby={props.inputID}
			dir={direction}
		>
			<BooleanAnswerButton
				label={labels.falseLabel}
				selected={!selectedValue}
				disabled={props.disabled}
				onClick={() => props.onChange(false)}
			/>
			<BooleanAnswerButton
				label={labels.trueLabel}
				selected={selectedValue}
				disabled={props.disabled}
				onClick={() => props.onChange(true)}
			/>
		</div>
	);
}

/**
 * BooleanAnswerButton is one option in the true/false segmented control.
 */
function BooleanAnswerButton(props: {
	readonly label: string;
	readonly selected: boolean;
	readonly disabled: boolean;
	readonly onClick: () => void;
}): ReactElement {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={props.selected}
			disabled={props.disabled}
			className={cn(
				'campfire-boolean-answer-option',
				props.selected && 'campfire-boolean-answer-option--selected',
			)}
			onClick={props.onClick}
		>
			<CampfireBidiText className="campfire-boolean-answer-label">{props.label}</CampfireBidiText>
			{props.selected && <CheckCircle2 className="cf:size-4" aria-hidden="true" />}
		</button>
	);
}

/**
 * booleanOptionLabels lets admins localize boolean labels by entering exactly
 * two options on the question. Otherwise Campfire keeps a clear default.
 */
function booleanOptionLabels(
	options: readonly string[],
	defaultFalseLabel: string,
	defaultTrueLabel: string,
): { readonly falseLabel: string; readonly trueLabel: string } {
	const cleanOptions = options.map(option => option.trim()).filter(Boolean);

	if (cleanOptions.length >= 2) {
		return {
			falseLabel: cleanOptions[0] ?? defaultFalseLabel,
			trueLabel: cleanOptions[1] ?? defaultTrueLabel,
		};
	}

	return { falseLabel: defaultFalseLabel, trueLabel: defaultTrueLabel };
}

/**
 * CheckboxQuestionControl renders checkbox option questions.
 */
function CheckboxQuestionControl(props: MyStandupQuestionFieldProps & { readonly inputID: string }): ReactElement {
	const { t } = useI18n();
	const options = props.question.options.length > 0 ? props.question.options : [t('myDay.standup.question.checkbox.default')];

	return (
		<div className={cn('campfire-standup-option-list', textDirectionFor([props.question.label, ...options]) === 'rtl' && 'campfire-standup-option-list--rtl')}>
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
						<CampfireBidiText className="campfire-standup-option-label cf:text-sm cf:font-semibold cf:text-foreground">{option}</CampfireBidiText>
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
		<div className={cn('campfire-standup-option-list', textDirectionFor([props.question.label, ...props.question.options]) === 'rtl' && 'campfire-standup-option-list--rtl')}>
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
						<CampfireBidiText className="campfire-standup-option-label cf:text-sm cf:font-semibold cf:text-foreground">{option}</CampfireBidiText>
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
	const { t } = useI18n();
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
								<CampfireResponsiveInput
									id={index === 0 ? props.inputID : undefined}
									disabled={props.disabled}
									placeholder={props.placeholder || t('myDay.standup.question.workItems.placeholder')}
									value={item}
									onValueChange={value => updateItem(index, value)}
									onKeyDown={event => handleItemKeyDown(event, index)}
								/>

								{exactMatch !== null && (
									<p className="campfire-task-match-hint">
										<CheckCircle2 className="cf:size-4" /> {t('myDay.standup.question.workItems.existingTask')}
									</p>
								)}

								{suggestions.length > 0 && exactMatch === null && (
									<div className="campfire-task-suggestion-list" role="listbox" aria-label={t('myDay.standup.question.workItems.suggestionsLabel')}>
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
								{t('myDay.standup.question.workItems.remove')}
							</Button>
						</div>
					);
				})}
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => addItem()}>
					<Plus className="cf:size-4" />
					{t('myDay.standup.question.workItems.add')}
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
