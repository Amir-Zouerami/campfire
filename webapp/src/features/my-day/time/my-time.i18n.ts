import type { TranslationKey } from '@/i18n';
import type { TaskStatus } from '@/types/domain';

/**
 * taskStatusTranslationKey maps task lifecycle states to localized labels.
 */
export function taskStatusTranslationKey(status: TaskStatus): TranslationKey {
	switch (status) {
		case 'active':
			return 'myDay.time.task.status.active';
		case 'blocked':
			return 'myDay.time.task.status.blocked';
		case 'completed':
			return 'myDay.time.task.status.completed';
		case 'dropped':
			return 'myDay.time.task.status.dropped';
		case 'archived':
			return 'myDay.time.task.status.archived';
	}
}

/**
 * formatLocalizedMinutes returns a compact translated duration label.
 */
export function formatLocalizedMinutes(
	minutes: number,
	translate: (key: TranslationKey, values?: Readonly<Record<string, string | number | boolean>>) => string,
): string {
	if (minutes < 60) {
		return translate('myDay.time.duration.minutes', { minutes });
	}

	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;

	if (remainder === 0) {
		return translate('myDay.time.duration.hours', { hours });
	}

	return translate('myDay.time.duration.hoursMinutes', { hours, minutes: remainder });
}

/**
 * formatLocalizedDateTime formats timestamps with the current UI locale.
 */
export function formatLocalizedDateTime(value: string, locale: string): string {
	if (value.trim() === '') {
		return '—';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

/**
 * formatLocalizedLocalDate formats stored YYYY-MM-DD dates with the current UI locale.
 */
export function formatLocalizedLocalDate(value: string, locale: string): string {
	const cleanValue = value.trim();
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanValue);
	if (match === null) {
		return cleanValue === '' ? '—' : cleanValue;
	}

	const year = Number.parseInt(match[1] ?? '', 10);
	const month = Number.parseInt(match[2] ?? '', 10);
	const day = Number.parseInt(match[3] ?? '', 10);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return cleanValue;
	}

	const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return cleanValue;
	}

	return new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}
