import { ApiClientError } from '@/api';
import type { TranslationKey } from '@/i18n';
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
		labelKey: 'teamReview.standups.sort.firstSubmitted.label',
		helperKey: 'teamReview.standups.sort.firstSubmitted.helper',
	},
	{
		value: 'last_submitted',
		labelKey: 'teamReview.standups.sort.lastSubmitted.label',
		helperKey: 'teamReview.standups.sort.lastSubmitted.helper',
	},
	{
		value: 'name',
		labelKey: 'teamReview.standups.sort.name.label',
		helperKey: 'teamReview.standups.sort.name.helper',
	},
	{
		value: 'missing_first',
		labelKey: 'teamReview.standups.sort.missingFirst.label',
		helperKey: 'teamReview.standups.sort.missingFirst.helper',
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
		...summary.excludedUserIds,
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
 * formatAnswerValue decodes stored JSON answer values for localized display.
 */
export function formatAnswerValue(valueJson: string, yesLabel: string, noLabel: string): string {
	const parsed = parseAnswerValue(valueJson);

	if (typeof parsed === 'string') {
		return parsed;
	}

	if (typeof parsed === 'boolean') {
		return parsed ? yesLabel : noLabel;
	}

	if (typeof parsed === 'number') {
		return String(parsed);
	}

	if (Array.isArray(parsed)) {
		return formatArrayAnswer(parsed);
	}

	return JSON.stringify(parsed);
}

/**
 * answerShouldHighlight returns whether an answer should stand out as a possible blocker.
 */
export function answerShouldHighlight(answer: StandupAnswer, question: StandupQuestion | undefined): boolean {
	const label = question?.label.toLowerCase() ?? '';
	const rawValue = plainAnswerValue(answer.valueJson).toLowerCase();

	if (label.includes('blocker') || label.includes('blocked')) {
		return rawValue.trim() !== '' && rawValue !== 'no' && rawValue !== 'false';
	}

	return rawValue.includes('blocked') || rawValue.includes('blocker');
}

/**
 * sortModeLabel returns a readable localized sort label.
 */
export function sortModeLabel(
	sortMode: StandupSubmissionSortMode,
	t: (key: TranslationKey) => string,
): string {
	const option = teamStandupSortOptions.find(candidate => candidate.value === sortMode);

	return option === undefined ? sortMode : t(option.labelKey);
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
export function formatDateTime(value: string, locale: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/**
 * userChipClassName returns a user chip style.
 */
export function userChipClassName(tone: 'green' | 'red' | 'slate'): string {
	if (tone === 'green') {
		return 'cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-semibold cf:text-emerald-100';
	}

	if (tone === 'red') {
		return 'cf:rounded-full cf:border cf:border-red-300/25 cf:bg-red-400/10 cf:px-3 cf:py-1 cf:text-xs cf:font-semibold cf:text-red-100';
	}

	return 'cf:rounded-full cf:border cf:border-white/10 cf:bg-white/10 cf:px-3 cf:py-1 cf:text-xs cf:font-semibold cf:text-slate-200';
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(
	error: unknown,
	fallbackMessage: string,
): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

/**
 * parseAnswerValue decodes a stored answer while preserving malformed values.
 */
function parseAnswerValue(valueJson: string): unknown {
	try {
		return JSON.parse(valueJson);
	} catch (_error: unknown) {
		return valueJson;
	}
}

/**
 * plainAnswerValue returns an untranslated string for rule checks.
 */
function plainAnswerValue(valueJson: string): string {
	const parsed = parseAnswerValue(valueJson);

	if (typeof parsed === 'string') {
		return parsed;
	}

	if (typeof parsed === 'boolean' || typeof parsed === 'number') {
		return String(parsed);
	}

	if (Array.isArray(parsed)) {
		return formatArrayAnswer(parsed);
	}

	return JSON.stringify(parsed);
}

/**
 * formatArrayAnswer maps simple and object-shaped arrays into readable rows.
 */
function formatArrayAnswer(values: readonly unknown[]): string {
	return values.map(value => {
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
	}).join(', ');
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
