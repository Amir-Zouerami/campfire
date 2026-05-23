import { ApiClientError } from '@/api';
import type {
	StandupAnswer,
	StandupOccurrenceSummary,
	StandupQuestion,
	StandupSubmissionSortMode,
} from '@/types/domain';

import type { TeamStandupSortOption } from './team-standups.types';

/**
 * teamStandupSortOptions lists supported submission review sort modes.
 */
export const teamStandupSortOptions: readonly TeamStandupSortOption[] = [
	{
		value: 'first_submitted',
		label: 'First submitted',
		helper: 'Earliest updates first',
	},
	{
		value: 'last_submitted',
		label: 'Last updated',
		helper: 'Recent edits first',
	},
	{
		value: 'name',
		label: 'Name',
		helper: 'Stable user order',
	},
	{
		value: 'missing_first',
		label: 'Missing first',
		helper: 'Focus on gaps',
	},
];

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
export function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * collectStandupReviewUserIDs returns every user ID referenced by a summary.
 */
export function collectStandupReviewUserIDs(summary: StandupOccurrenceSummary | null): readonly string[] {
	if (summary === null) {
		return [];
	}

	return uniqueStrings([
		...summary.memberUserIds,
		...summary.submittedUserIds,
		...summary.missingUserIds,
		...summary.onLeaveUserIds,
		...summary.submissions.map(row => row.submission.userId),
	]);
}

/**
 * questionMapByID creates a lookup table for standup question labels.
 */
export function questionMapByID(questions: readonly StandupQuestion[]): Readonly<Record<string, StandupQuestion>> {
	const result: Record<string, StandupQuestion> = {};

	for (const question of questions) {
		result[question.id] = question;
	}

	return result;
}

/**
 * submittedPercent returns a rounded submitted percentage for one occurrence.
 */
export function submittedPercent(summary: StandupOccurrenceSummary | null): number {
	if (summary === null || summary.memberUserIds.length === 0) {
		return 0;
	}

	return Math.round((summary.submittedUserIds.length / summary.memberUserIds.length) * 100);
}

/**
 * formatAnswerValue decodes stored JSON answer values for display.
 */
export function formatAnswerValue(valueJson: string): string {
	try {
		const parsed: unknown = JSON.parse(valueJson);

		if (typeof parsed === 'string') {
			return parsed;
		}

		if (typeof parsed === 'boolean') {
			return parsed ? 'Yes' : 'No';
		}

		if (typeof parsed === 'number') {
			return String(parsed);
		}

		if (Array.isArray(parsed)) {
			return parsed.map(value => String(value)).join(', ');
		}

		return JSON.stringify(parsed);
	} catch (_error: unknown) {
		return valueJson;
	}
}

/**
 * answerShouldHighlight returns whether an answer should stand out as a possible blocker.
 */
export function answerShouldHighlight(answer: StandupAnswer, question: StandupQuestion | undefined): boolean {
	const label = question?.label.toLowerCase() ?? '';
	const value = formatAnswerValue(answer.valueJson).toLowerCase();

	if (label.includes('blocker') || label.includes('blocked')) {
		return value.trim() !== '' && value !== 'no' && value !== 'false';
	}

	return value.includes('blocked') || value.includes('blocker');
}

/**
 * sortModeLabel returns a readable sort label.
 */
export function sortModeLabel(sortMode: StandupSubmissionSortMode): string {
	return teamStandupSortOptions.find(option => option.value === sortMode)?.label ?? sortMode;
}

/**
 * toStandupSortMode narrows a string to a known sort mode.
 */
export function toStandupSortMode(value: string): StandupSubmissionSortMode {
	if (value === 'name' || value === 'last_submitted' || value === 'missing_first') {
		return value;
	}

	return 'first_submitted';
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * selectClassName returns the shared native select style.
 */

/**
 * userChipClassName returns a user chip style.
 */
export function userChipClassName(tone: 'green' | 'red' | 'slate'): string {
	if (tone === 'green') {
		return 'cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100';
	}

	if (tone === 'red') {
		return 'cf:rounded-full cf:border cf:border-red-300/25 cf:bg-red-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-red-100';
	}

	return 'cf:rounded-full cf:border cf:border-white/10 cf:bg-white/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-slate-200';
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

	return 'Could not load standup submissions.';
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
