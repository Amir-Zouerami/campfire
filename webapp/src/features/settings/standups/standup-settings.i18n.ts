import type { TFunction, TranslationKey } from '@/i18n';
import type { QuestionType, StandupKind } from '@/types/domain';

const standupKindKeys: Readonly<Record<StandupKind, TranslationKey>> = {
	daily: 'settings.standups.kind.daily',
	weekly: 'settings.standups.kind.weekly',
	custom: 'settings.standups.kind.custom',
};

const questionTypeKeys: Readonly<Record<QuestionType, TranslationKey>> = {
	text: 'settings.standups.questionType.text',
	long_text: 'settings.standups.questionType.long_text',
	work_items: 'settings.standups.questionType.work_items',
	date: 'settings.standups.questionType.date',
	time: 'settings.standups.questionType.time',
	datetime: 'settings.standups.questionType.datetime',
	checkbox: 'settings.standups.questionType.checkbox',
	boolean: 'settings.standups.questionType.boolean',
	dropdown: 'settings.standups.questionType.dropdown',
	multi_select: 'settings.standups.questionType.multi_select',
	number: 'settings.standups.questionType.number',
	duration: 'settings.standups.questionType.duration',
};

/**
 * standupKindLabel returns the localized display label for a standup cadence.
 */
export function standupKindLabel(t: TFunction, kind: StandupKind): string {
	const key = standupKindKeys[kind];
	return key === undefined ? String(kind || t('settings.standups.kind.custom')) : t(key);
}

/**
 * questionTypeLabel returns the localized display label for a supported question type.
 */
export function questionTypeLabel(t: TFunction, type: QuestionType): string {
	const key = questionTypeKeys[type];
	return key === undefined ? String(type || t('settings.standups.questionType.text')) : t(key);
}

/**
 * countLabel renders a localized count phrase for standup configuration lists.
 */
export function countLabel(t: TFunction, count: number, singularKey: CountTranslationKey, pluralKey: CountTranslationKey): string {
	return count === 1 ? t(singularKey) : t(pluralKey, { count });
}

type CountTranslationKey =
	| 'settings.standups.count.question.one'
	| 'settings.standups.count.question.many'
	| 'settings.standups.count.schedule.one'
	| 'settings.standups.count.schedule.many'
	| 'settings.standups.count.template.one'
	| 'settings.standups.count.template.many';

