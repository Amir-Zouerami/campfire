import type { StandupQuestion } from '@/types/domain';

import type { AnswerDrafts } from './my-standup.types';

/**
 * normalizeTaskTitleKey creates a stable comparison key for task titles.
 */
function normalizeTaskTitleKey(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * isTaskListQuestion returns whether a question should be edited as a list of work items.
 *
 * Task generation is now explicit backend configuration. The frontend no longer
 * guesses from labels like "today" or "yesterday", because that created hidden
 * behavior and made template design unpredictable.
 */
export function isTaskListQuestion(question: StandupQuestion): boolean {
	return question.createsTasks && (question.type === 'long_text' || question.type === 'text');
}

/**
 * parseTaskListItems converts raw answer text into individual list items.
 */
export function parseTaskListItems(value: string): readonly string[] {
	return value
		.split(/\r?\n/g)
		.map((line) => line.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '').trim())
		.filter((line) => line !== '');
}

/**
 * formatTaskListValue converts list items back into Markdown list text.
 */
export function formatTaskListValue(items: readonly string[]): string {
	return items
		.map((item) => item.trim())
		.filter((item) => item !== '')
		.map((item) => `- ${item}`)
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
