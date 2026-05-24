import type { StandupQuestion } from '@/types/domain';

import type { AnswerDrafts } from './my-standup.types';

/**
 * workItemHintTokens identify standup questions that should behave like task lists.
 */
const workItemHintTokens = ['today', 'plan', 'progress', 'yesterday', 'task', 'work item'];

/**
 * excludedHintTokens identify standup questions that should not create tasks.
 */
const excludedHintTokens = ['blocker', 'blocked', 'impediment'];

/**
 * normalizeTaskTitleKey creates a stable comparison key for task titles.
 */
function normalizeTaskTitleKey(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * questionSearchText returns searchable question text.
 */
function questionSearchText(question: StandupQuestion): string {
	return [
		question.questionKey,
		question.label,
		question.section,
		question.prompt,
		question.helpText,
		question.placeholder,
	]
		.join(' ')
		.toLowerCase();
}

/**
 * isTaskListQuestion returns whether a question should be edited as a list of work items.
 */
export function isTaskListQuestion(question: StandupQuestion): boolean {
	if (question.type !== 'long_text' && question.type !== 'text') {
		return false;
	}

	const haystack = questionSearchText(question);

	if (excludedHintTokens.some(token => haystack.includes(token))) {
		return false;
	}

	return workItemHintTokens.some(token => haystack.includes(token));
}

/**
 * parseTaskListItems converts raw answer text into individual list items.
 */
export function parseTaskListItems(value: string): readonly string[] {
	return value
		.split(/\r?\n/g)
		.map(line => line.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '').trim())
		.filter(line => line !== '');
}

/**
 * formatTaskListValue converts list items back into Markdown list text.
 */
export function formatTaskListValue(items: readonly string[]): string {
	return items
		.map(item => item.trim())
		.filter(item => item !== '')
		.map(item => `- ${item}`)
		.join('\n');
}

/**
 * taskTitlesFromStandupAnswers extracts unique work items that should become tasks.
 */
export function taskTitlesFromStandupAnswers(
	questions: readonly StandupQuestion[],
	answers: AnswerDrafts,
): readonly string[] {
	const seen = new Set<string>();
	const titles: string[] = [];

	for (const question of questions) {
		if (!isTaskListQuestion(question)) {
			continue;
		}

		const rawValue = answers[question.id];

		if (typeof rawValue !== 'string') {
			continue;
		}

		for (const item of parseTaskListItems(rawValue)) {
			const key = normalizeTaskTitleKey(item);

			if (key === '' || seen.has(key)) {
				continue;
			}

			seen.add(key);
			titles.push(item);
		}
	}

	return titles;
}
