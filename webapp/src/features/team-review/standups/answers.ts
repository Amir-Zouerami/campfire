import type { StandupAnswer, StandupQuestion } from '@/shared/types/domain';

/**
 * parseAnswer reads a stored answer's JSON, falling back to the raw text for legacy rows.
 */
function parseAnswer(valueJson: string): unknown {
	try {
		return JSON.parse(valueJson) as unknown;
	} catch {
		return valueJson;
	}
}

function formatList(values: readonly unknown[]): string {
	return values
		.map(value => {
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				return String(value);
			}

			if (typeof value === 'object' && value !== null) {
				const record = value as Record<string, unknown>;
				const title = record.title ?? record.text ?? record.value ?? record.label;
				if (typeof title === 'string' && title.trim() !== '') {
					return title;
				}
			}

			return JSON.stringify(value);
		})
		.join(', ');
}

/**
 * answerText renders a stored answer for reading, with booleans shown as localized yes/no.
 */
export function answerText(valueJson: string, yesLabel: string, noLabel: string): string {
	const parsed = parseAnswer(valueJson);

	if (typeof parsed === 'string') {
		return parsed;
	}

	if (typeof parsed === 'boolean') {
		return parsed ? yesLabel : noLabel;
	}

	if (typeof parsed === 'number') {
		return String(parsed);
	}

	return Array.isArray(parsed) ? formatList(parsed) : JSON.stringify(parsed);
}

/**
 * BLOCKER_WORDS are the words, in the languages Campfire supports, that mark a question
 * as being about blockers. Matching on the question's own label keeps working for
 * custom forms without needing a dedicated "blocker" question type.
 */
const BLOCKER_WORDS = ['blocker', 'blocked', 'مانع', 'موانع', 'بلاک', 'عائق', 'عوائق'];

function mentionsBlocker(text: string): boolean {
	const lowered = text.toLowerCase();

	return BLOCKER_WORDS.some(word => lowered.includes(word));
}

/**
 * answerNeedsAttention flags a blocker question that was answered with something other than
 * "no", or any answer that itself mentions being blocked, so managers can scan for problems.
 */
export function answerNeedsAttention(answer: StandupAnswer, question: StandupQuestion | undefined): boolean {
	const parsed = parseAnswer(answer.valueJson);
	const value = (typeof parsed === 'string' ? parsed : Array.isArray(parsed) ? formatList(parsed) : String(parsed)).trim().toLowerCase();

	if (question !== undefined && mentionsBlocker(question.label)) {
		return value !== '' && value !== 'no' && value !== 'false' && value !== 'none' && value !== 'n/a';
	}

	return mentionsBlocker(value);
}
