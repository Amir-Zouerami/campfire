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
