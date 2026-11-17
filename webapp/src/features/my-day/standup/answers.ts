import type { TFunction } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import type { QuestionType, StandupAnswer, StandupQuestion } from '@/shared/types/domain';

/**
 * AnswerValue is the editable value of one standup answer, shaped by its question type:
 * `work_items` is a list of rows, `multi_select` a list of chosen options, `checkbox` and
 * `boolean` are booleans, and everything else is text.
 */
export type AnswerValue = string | boolean | readonly string[];

/**
 * AnswerMap holds the draft answers of one form, keyed by question ID.
 */
export type AnswerMap = Readonly<Record<string, AnswerValue>>;

/**
 * emptyAnswer returns the blank value for a question type.
 */
export function emptyAnswer(type: QuestionType): AnswerValue {
	switch (type) {
		case 'checkbox':
		case 'boolean':
			return false;
		case 'multi_select':
		case 'work_items':
			return [];
		default:
			return '';
	}
}

/**
 * emptyAnswers builds a blank draft for a set of questions.
 */
export function emptyAnswers(questions: readonly StandupQuestion[]): AnswerMap {
	return Object.fromEntries(questions.map(question => [question.id, emptyAnswer(question.type)]));
}

/**
 * parseListItems turns stored list text (Markdown bullets, numbered lines or plain lines) into rows.
 */
export function parseListItems(text: string): readonly string[] {
	return text
		.split(/\r?\n/g)
		.map(line => line.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '').trim())
		.filter(line => line !== '');
}

/**
 * formatListItems serializes rows as a Markdown list, the format the backend and reports expect.
 */
export function formatListItems(items: readonly string[]): string {
	return items
		.map(item => item.trim())
		.filter(item => item !== '')
		.map(item => `- ${item}`)
		.join('\n');
}

/**
 * answersFromStored rebuilds editable drafts from a previously saved submission, so a member
 * can correct an earlier standup instead of overwriting it with a blank form.
 */
export function answersFromStored(questions: readonly StandupQuestion[], stored: readonly StandupAnswer[]): AnswerMap {
	const valueByQuestion = new Map(stored.map(answer => [answer.questionId, answer.valueJson]));

	return Object.fromEntries(questions.map(question => [question.id, storedToAnswer(question, valueByQuestion.get(question.id))]));
}

function storedToAnswer(question: StandupQuestion, valueJSON: string | undefined): AnswerValue {
	if (valueJSON === undefined || valueJSON.trim() === '') {
		return emptyAnswer(question.type);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(valueJSON);
	} catch {
		parsed = valueJSON;
	}

	switch (question.type) {
		case 'checkbox':
		case 'boolean':
			return parsed === true;
		case 'multi_select':
			return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
		case 'work_items':
			return typeof parsed === 'string' ? parseListItems(parsed) : [];
		case 'number':
		case 'duration':
			return parsed === null || parsed === undefined ? '' : String(parsed);
		default:
			return typeof parsed === 'string' ? parsed : String(parsed ?? '');
	}
}

/**
 * serializeAnswer converts a draft into the JSON value the API stores.
 */
export function serializeAnswer(question: StandupQuestion, value: AnswerValue | undefined): string {
	const draft = value ?? emptyAnswer(question.type);

	switch (question.type) {
		case 'checkbox':
		case 'boolean':
			return JSON.stringify(draft === true);
		case 'multi_select':
			return JSON.stringify(Array.isArray(draft) ? draft : []);
		case 'work_items':
			return JSON.stringify(Array.isArray(draft) ? formatListItems(draft) : '');
		case 'number': {
			const parsed = Number.parseFloat(String(draft));

			return JSON.stringify(Number.isFinite(parsed) ? parsed : null);
		}
		case 'duration': {
			const parsed = Number.parseInt(String(draft), 10);

			return JSON.stringify(Number.isFinite(parsed) ? parsed : null);
		}
		default:
			return JSON.stringify(String(draft));
	}
}

/**
 * answerFieldName is the form field path of one question's answer.
 */
export function answerFieldName(questionID: string): `answers.${string}` {
	return `answers.${questionID}`;
}

function isMissing(question: StandupQuestion, value: AnswerValue | undefined): boolean {
	switch (question.type) {
		case 'boolean':
			return false;
		case 'checkbox':
			return value !== true;
		case 'multi_select':
			return !Array.isArray(value) || value.length === 0;
		case 'work_items':
			return !Array.isArray(value) || value.every(row => row.trim() === '');
		default:
			return value === undefined || String(value).trim() === '';
	}
}

/**
 * validateAnswers returns an error message per required question that is unanswered,
 * keyed by form field path so the form can show each message beside its field.
 */
export function validateAnswers(questions: readonly StandupQuestion[], answers: AnswerMap, t: TFunction): Readonly<Record<string, string>> {
	const errors: Record<string, string> = {};

	for (const question of questions) {
		if (!question.required || !isMissing(question, answers[question.id])) {
			continue;
		}

		errors[answerFieldName(question.id)] =
			question.type === 'work_items'
				? t('myDay.standup.validation.taskItemsRequired', { questionLabel: isolateBidi(question.label) })
				: t('myDay.standup.validation.answerRequired', { questionLabel: isolateBidi(question.label) });
	}

	return errors;
}

/**
 * questionsOfTemplate returns a template's questions in display order.
 */
export function questionsOfTemplate(questions: readonly StandupQuestion[], templateID: string): readonly StandupQuestion[] {
	return questions
		.filter(question => question.templateId === templateID)
		.sort((first, second) => first.position - second.position || first.label.localeCompare(second.label));
}
