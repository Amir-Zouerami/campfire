import { ApiClientError } from '@/api';
import type { QuestionType, StandupQuestion, StandupSchedule, StandupTemplate, Task } from '@/types/domain';

import type { AnswerDrafts, AnswerDraftValue, NormalizedAnswerValue } from './my-standup.types';
import { isTaskListQuestion, parseTaskListItems } from './standup-task-list.helpers';

/**
 * getTodayLocalDateString returns today's date as YYYY-MM-DD in the browser timezone.
 */
export function getTodayLocalDateString(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * enabledOrFirstSchedule returns the first enabled schedule, falling back to any schedule.
 */
export function enabledOrFirstSchedule(schedules: readonly StandupSchedule[]): StandupSchedule | null {
	const enabledSchedule = schedules.find(schedule => schedule.enabled);

	if (enabledSchedule !== undefined) {
		return enabledSchedule;
	}

	return schedules[0] ?? null;
}

/**
 * findTemplateForSchedule returns the template used by the selected schedule.
 */
export function findTemplateForSchedule(
	templates: readonly StandupTemplate[],
	schedule: StandupSchedule | null,
): StandupTemplate | null {
	if (schedule === null) {
		return null;
	}

	return templates.find(template => template.id === schedule.templateId) ?? null;
}

/**
 * questionsForTemplate returns ordered questions for one template.
 */
export function questionsForTemplate(
	questions: readonly StandupQuestion[],
	template: StandupTemplate | null,
): readonly StandupQuestion[] {
	if (template === null) {
		return [];
	}

	return questions
		.filter(question => question.templateId === template.id)
		.sort((first, second) => first.position - second.position || first.label.localeCompare(second.label));
}

/**
 * activeTasksForStandup returns current-user tasks that are useful context during check-in.
 */
export function activeTasksForStandup(tasks: readonly Task[]): readonly Task[] {
	return tasks.filter(task => task.status === 'active' || task.status === 'blocked');
}

/**
 * buildInitialAnswers creates a draft answer map for a selected template.
 */
export function buildInitialAnswers(questions: readonly StandupQuestion[], templateID: string): AnswerDrafts {
	const drafts: Record<string, AnswerDraftValue> = {};

	for (const question of questions) {
		if (question.templateId !== templateID) {
			continue;
		}

		drafts[question.id] = emptyAnswerForQuestion(question.type);
	}

	return drafts;
}

/**
 * emptyAnswerForQuestion returns the empty value for one question type.
 */
export function emptyAnswerForQuestion(questionType: QuestionType): AnswerDraftValue {
	switch (questionType) {
		case 'checkbox':
		case 'boolean':
			return false;

		case 'multi_select':
			return [];

		case 'text':
		case 'long_text':
		case 'dropdown':
		case 'number':
		case 'duration':
		default:
			return '';
	}
}

/**
 * normalizeAnswerValue maps a draft answer to the API JSON value.
 */
export function normalizeAnswerValue(
	question: StandupQuestion,
	value: AnswerDraftValue | undefined,
): NormalizedAnswerValue {
	if (value === undefined) {
		return emptyNormalizedValue(question.type);
	}

	switch (question.type) {
		case 'checkbox':
		case 'boolean':
			return value === true;

		case 'multi_select':
			return Array.isArray(value) ? value : [];

		case 'number': {
			const parsed = Number.parseFloat(String(value));

			return Number.isFinite(parsed) ? parsed : null;
		}

		case 'duration': {
			const parsed = Number.parseInt(String(value), 10);

			return Number.isFinite(parsed) ? parsed : null;
		}

		case 'text':
		case 'long_text':
		case 'dropdown':
		default:
			return String(value);
	}
}

/**
 * validateRequiredAnswers returns a user-facing validation message when required answers are missing.
 */
export function validateRequiredAnswers(questions: readonly StandupQuestion[], answers: AnswerDrafts): string | null {
	for (const question of questions) {
		if (!question.required) {
			continue;
		}

		const value = answers[question.id];

		if (isTaskListQuestion(question) && taskListAnswerIsMissing(value)) {
			return `${question.label} needs at least one item.`;
		}

		if (!isTaskListQuestion(question) && answerIsMissing(question.type, value)) {
			return `${question.label} is required.`;
		}
	}

	return null;
}

/**
 * questionValueAsString safely reads a draft answer as a string.
 */
export function questionValueAsString(value: AnswerDraftValue | undefined): string {
	if (typeof value === 'string') {
		return value;
	}

	return '';
}

/**
 * questionValueAsBoolean safely reads a draft answer as a boolean.
 */
export function questionValueAsBoolean(value: AnswerDraftValue | undefined): boolean {
	return value === true;
}

/**
 * questionValueAsList safely reads a draft answer as a string array.
 */
export function questionValueAsList(value: AnswerDraftValue | undefined): readonly string[] {
	return Array.isArray(value) ? value : [];
}

/**
 * nextMultiSelectValue toggles one option in a multi-select answer.
 */
export function nextMultiSelectValue(
	currentValue: AnswerDraftValue | undefined,
	option: string,
	checked: boolean,
): readonly string[] {
	const current = new Set(questionValueAsList(currentValue));

	if (checked) {
		current.add(option);
	} else {
		current.delete(option);
	}

	return [...current];
}

/**
 * templateLabel returns a readable template name for a schedule row.
 */
export function templateLabel(templates: readonly StandupTemplate[], templateID: string): string {
	return templates.find(template => template.id === templateID)?.name ?? 'Unknown template';
}

/**
 * formatLabel converts enum-like API values to readable labels.
 */
export function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not submit your standup.';
}

/**
 * emptyNormalizedValue returns the blank submitted value for a question type.
 */
function emptyNormalizedValue(questionType: QuestionType): NormalizedAnswerValue {
	switch (questionType) {
		case 'checkbox':
		case 'boolean':
			return false;

		case 'multi_select':
			return [];

		case 'number':
		case 'duration':
			return null;

		case 'text':
		case 'long_text':
		case 'dropdown':
		default:
			return '';
	}
}

/**
 * answerIsMissing returns whether a required answer is empty.
 */
function answerIsMissing(questionType: QuestionType, value: AnswerDraftValue | undefined): boolean {
	if (value === undefined) {
		return true;
	}

	switch (questionType) {
		case 'boolean':
			return false;

		case 'checkbox':
			return value !== true;

		case 'multi_select':
			return !Array.isArray(value) || value.length === 0;

		case 'text':
		case 'long_text':
		case 'dropdown':
		case 'number':
		case 'duration':
		default:
			return String(value).trim() === '';
	}
}


/**
 * taskListAnswerIsMissing returns true when a required task-creating answer
 * only has the automatically appended empty draft row.
 */
function taskListAnswerIsMissing(value: AnswerDraftValue | undefined): boolean {
	if (typeof value !== 'string') {
		return true;
	}

	return parseTaskListItems(value).length === 0;
}
