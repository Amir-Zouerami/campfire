import { ApiClientError } from '@/api';
import type { TFunction } from '@/i18n/types';
import type { GlobalSkipDate } from '@/types/domain';

import type { GlobalOffDayDraft } from './global-off-days.types';

/**
 * emptyGlobalOffDayDraft returns the default create form state.
 */
export function emptyGlobalOffDayDraft(): GlobalOffDayDraft {
	return {
		date: getTodayLocalDateString(),
		label: '',
	};
}

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
 * sortGlobalOffDays returns skip dates ordered by date and label.
 */
export function sortGlobalOffDays(skipDates: readonly GlobalSkipDate[]): readonly GlobalSkipDate[] {
	return [...skipDates].sort((first, second) => {
		if (first.date === second.date) {
			return first.label.localeCompare(second.label);
		}

		return first.date.localeCompare(second.date);
	});
}

/**
 * upcomingGlobalOffDayCount returns skip dates from today onward.
 */
export function upcomingGlobalOffDayCount(skipDates: readonly GlobalSkipDate[]): number {
	const today = getTodayLocalDateString();

	return skipDates.filter(skipDate => skipDate.date >= today).length;
}

/**
 * globalOffDayIsPast returns whether the skip date is before today.
 */
export function globalOffDayIsPast(skipDate: GlobalSkipDate): boolean {
	return skipDate.date < getTodayLocalDateString();
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string, locale: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown, t: TFunction): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return t('settings.globalOffDays.error.update');
}
