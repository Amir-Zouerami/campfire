import type { QuestionType, StandupKind, StandupQuestion, StandupSchedule, StandupTemplate, WeeklyMode } from '@/shared/types/domain';
import type { CreateStandupQuestionRequest, CreateStandupScheduleRequest } from '@/shared/types/api';

import { timeToMinutes } from '../reminders/reminderTimes';

export const QUESTION_TYPES: readonly QuestionType[] = [
	'text',
	'long_text',
	'work_items',
	'date',
	'time',
	'datetime',
	'checkbox',
	'boolean',
	'dropdown',
	'multi_select',
	'number',
	'duration',
];

export const STANDUP_KINDS: readonly StandupKind[] = ['daily', 'weekly', 'custom'];

/**
 * typeNeedsOptions reports whether a question type offers a fixed set of choices.
 */
export function typeNeedsOptions(type: QuestionType): boolean {
	return type === 'checkbox' || type === 'dropdown' || type === 'multi_select';
}

/**
 * parseOptions splits an options text (one per line, commas also work) into unique, non-empty options.
 */
export function parseOptions(value: string): readonly string[] {
	return [
		...new Set(
			value
				.split(/[\n,]+/)
				.map(option => option.trim())
				.filter(option => option !== ''),
		),
	];
}

/**
 * normalizeName trims and collapses whitespace so "Daily  standup " and "Daily standup" are one name.
 */
export function normalizeName(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

/**
 * isDuplicateName reports whether another template already uses this name (ignoring case).
 */
export function isDuplicateName(templates: readonly StandupTemplate[], name: string, exceptID?: string): boolean {
	const key = normalizeName(name).toLowerCase();

	return templates.some(template => template.id !== exceptID && normalizeName(template.name).toLowerCase() === key);
}

/**
 * opensBeforeCloses is true when the opening time is strictly earlier than the closing time.
 */
export function opensBeforeCloses(opensAt: string, closesAt: string): boolean {
	const open = timeToMinutes(opensAt);
	const close = timeToMinutes(closesAt);

	return open !== null && close !== null && open < close;
}

/**
 * nextPosition is the sort position for a new question: ten after the last one, so questions
 * can later be slotted in between.
 */
export function nextPosition(questions: readonly StandupQuestion[], templateID: string): number {
	const positions = questions.filter(question => question.templateId === templateID).map(question => question.position);

	return positions.length === 0 ? 10 : Math.max(...positions) + 10;
}

/**
 * sortQuestions orders questions by position, then label.
 */
export function sortQuestions(questions: readonly StandupQuestion[]): readonly StandupQuestion[] {
	return [...questions].sort((first, second) =>
		first.position === second.position ? first.label.localeCompare(second.label) : first.position - second.position,
	);
}

/**
 * sortSchedules orders schedules by kind, then closing time.
 */
export function sortSchedules(schedules: readonly StandupSchedule[]): readonly StandupSchedule[] {
	return [...schedules].sort((first, second) =>
		first.kind === second.kind ? first.timeOfDay.localeCompare(second.timeOfDay) : first.kind.localeCompare(second.kind),
	);
}

/**
 * sortTemplates orders templates by kind, then name.
 */
export function sortTemplates(templates: readonly StandupTemplate[]): readonly StandupTemplate[] {
	return [...templates].sort((first, second) =>
		first.kind === second.kind ? first.name.localeCompare(second.name) : first.kind.localeCompare(second.kind),
	);
}

export type QuestionValues = {
	readonly section: string;
	readonly label: string;
	readonly helpText: string;
	readonly placeholder: string;
	readonly type: QuestionType;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
	readonly createsTasks: boolean;
	readonly position: number;
	readonly optionsText: string;
};

/**
 * questionValuesOf turns a stored question into form values.
 */
export function questionValuesOf(question: StandupQuestion): QuestionValues {
	return {
		section: question.section,
		label: question.label,
		helpText: question.helpText,
		placeholder: question.placeholder,
		type: question.type,
		required: question.required,
		showInReport: question.showInReport,
		isPrivate: question.isPrivate,
		createsTasks: question.createsTasks,
		position: question.position,
		optionsText: question.options.join('\n'),
	};
}

/**
 * questionRequest builds the API payload. Only work-item questions can create tasks, so the
 * flag is cleared for every other type.
 */
export function questionRequest(templateID: string, values: QuestionValues): CreateStandupQuestionRequest {
	return {
		templateId: templateID,
		section: values.section.trim(),
		label: values.label.trim(),
		helpText: values.helpText.trim(),
		placeholder: values.placeholder.trim(),
		type: values.type,
		required: values.required,
		showInReport: values.showInReport,
		isPrivate: values.isPrivate,
		createsTasks: values.type === 'work_items' ? values.createsTasks : false,
		position: values.position,
		options: parseOptions(values.optionsText),
	};
}

export type ScheduleValues = {
	readonly kind: StandupKind;
	readonly enabled: boolean;
	readonly opensAt: string;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: WeeklyMode | 'none';
};

/**
 * scheduleValuesOf turns a stored schedule into form values.
 */
export function scheduleValuesOf(schedule: StandupSchedule): ScheduleValues {
	return {
		kind: schedule.kind,
		enabled: schedule.enabled,
		opensAt: schedule.opensAt,
		timeOfDay: schedule.timeOfDay,
		skipNonWorkingDays: schedule.skipNonWorkingDays,
		weeklyMode: schedule.weeklyMode === 'last_working_day' ? 'last_working_day' : 'none',
	};
}

/**
 * scheduleRequest builds the API payload. Weekly mode only applies to weekly schedules, and
 * "skip daily when weekly runs" is always off: daily and weekly schedules are independent.
 */
export function scheduleRequest(templateID: string, values: ScheduleValues): CreateStandupScheduleRequest {
	return {
		templateId: templateID,
		kind: values.kind,
		enabled: values.enabled,
		opensAt: values.opensAt,
		timeOfDay: values.timeOfDay,
		skipNonWorkingDays: values.skipNonWorkingDays,
		weeklyMode: values.kind === 'weekly' ? values.weeklyMode : 'none',
		skipDailyWhenWeeklyRuns: false,
	};
}
