import { ApiClientError } from '@/api';
import type {
	CreateStandupQuestionRequest,
	CreateStandupScheduleRequest,
	CreateStandupTemplateRequest,
	UpdateStandupQuestionRequest,
	UpdateStandupScheduleRequest,
	UpdateStandupTemplateRequest,
} from '@/types/api';
import type {
	QuestionType,
	StandupKind,
	StandupQuestion,
	StandupSchedule,
	StandupTemplate,
	WeeklyMode,
} from '@/types/domain';

import type {
	StandupQuestionDraft,
	StandupQuestionDraftsByID,
	StandupQuestionWithDraft,
	StandupScheduleDraft,
	StandupScheduleDraftsByID,
	StandupScheduleWithDraft,
	StandupTemplateDraft,
	StandupTemplateDraftsByID,
	StandupTemplateWithDetails,
	StandupTemplateWithDraft,
} from './standup-settings.types';

/**
 * SUPPORTED_QUESTION_TYPES lists every MVP dynamic-form question type.
 */
export const SUPPORTED_QUESTION_TYPES: readonly QuestionType[] = [
	'text',
	'long_text',
	'checkbox',
	'boolean',
	'dropdown',
	'multi_select',
	'number',
	'duration',
];

/**
 * STANDUP_KINDS lists all supported template and schedule kinds.
 */
export const STANDUP_KINDS: readonly StandupKind[] = ['daily', 'weekly', 'custom'];

/**
 * WEEKLY_MODES lists schedule weekly-mode options.
 */
export const WEEKLY_MODES: readonly (WeeklyMode | 'none')[] = ['none', 'last_working_day'];

/**
 * emptyTemplateDraft returns a blank editable template draft.
 */
export function emptyTemplateDraft(): StandupTemplateDraft {
	return {
		name: '',
		description: '',
		kind: 'daily',
		isActive: true,
	};
}

/**
 * emptyScheduleDraft returns a safe default schedule draft.
 */
export function emptyScheduleDraft(templateID = ''): StandupScheduleDraft {
	return {
		templateId: templateID,
		kind: 'daily',
		enabled: true,
		timeOfDay: '09:00',
		skipNonWorkingDays: true,
		weeklyMode: 'none',
		skipDailyWhenWeeklyRuns: false,
	};
}

/**
 * emptyQuestionDraft returns a blank dynamic-form question draft.
 */
export function emptyQuestionDraft(templateID = '', position = 10): StandupQuestionDraft {
	return {
		templateId: templateID,
		section: '',
		label: '',
		helpText: '',
		placeholder: '',
		type: 'text',
		required: true,
		showInReport: true,
		isPrivate: false,
		createsTasks: false,
		position,
		optionsText: '',
	};
}

/**
 * templateToDraft maps a saved template into editable state.
 */
export function templateToDraft(template: StandupTemplate): StandupTemplateDraft {
	return {
		name: template.name,
		description: template.description,
		kind: template.kind,
		isActive: template.isActive,
	};
}

/**
 * scheduleToDraft maps a saved schedule into editable state.
 */
export function scheduleToDraft(schedule: StandupSchedule): StandupScheduleDraft {
	return {
		templateId: schedule.templateId,
		kind: schedule.kind,
		enabled: schedule.enabled,
		timeOfDay: schedule.timeOfDay,
		skipNonWorkingDays: schedule.skipNonWorkingDays,
		weeklyMode: schedule.weeklyMode,
		skipDailyWhenWeeklyRuns: schedule.skipDailyWhenWeeklyRuns,
	};
}

/**
 * questionToDraft maps a saved question into editable state.
 */
export function questionToDraft(question: StandupQuestion): StandupQuestionDraft {
	return {
		templateId: question.templateId,
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
 * buildTemplateDrafts maps templates into a draft lookup.
 */
export function buildTemplateDrafts(templates: readonly StandupTemplate[]): StandupTemplateDraftsByID {
	const drafts: StandupTemplateDraftsByID = {};

	for (const template of templates) {
		drafts[template.id] = templateToDraft(template);
	}

	return drafts;
}

/**
 * buildScheduleDrafts maps schedules into a draft lookup.
 */
export function buildScheduleDrafts(schedules: readonly StandupSchedule[]): StandupScheduleDraftsByID {
	const drafts: StandupScheduleDraftsByID = {};

	for (const schedule of schedules) {
		drafts[schedule.id] = scheduleToDraft(schedule);
	}

	return drafts;
}

/**
 * buildQuestionDrafts maps questions into a draft lookup.
 */
export function buildQuestionDrafts(questions: readonly StandupQuestion[]): StandupQuestionDraftsByID {
	const drafts: StandupQuestionDraftsByID = {};

	for (const question of questions) {
		drafts[question.id] = questionToDraft(question);
	}

	return drafts;
}

/**
 * normalizeTemplateCreate maps template draft state to a create request.
 */
export function normalizeTemplateCreate(draft: StandupTemplateDraft): CreateStandupTemplateRequest {
	return {
		name: normalizeTemplateName(draft.name),
		description: draft.description.trim(),
		kind: draft.kind,
		isActive: draft.isActive,
	};
}

/**
 * normalizeTemplateUpdate maps template draft state to an update request.
 */
export function normalizeTemplateUpdate(draft: StandupTemplateDraft): UpdateStandupTemplateRequest {
	return {
		name: normalizeTemplateName(draft.name),
		description: draft.description.trim(),
		kind: draft.kind,
		isActive: draft.isActive,
	};
}

/**
 * normalizeScheduleDraft maps schedule draft state to a create/update request.
 */
export function normalizeScheduleDraft(
	draft: StandupScheduleDraft,
): CreateStandupScheduleRequest & UpdateStandupScheduleRequest {
	return {
		templateId: draft.templateId,
		kind: draft.kind,
		enabled: draft.enabled,
		timeOfDay: draft.timeOfDay,
		skipNonWorkingDays: draft.skipNonWorkingDays,
		weeklyMode: draft.kind === 'weekly' ? normalizeWeeklyMode(draft.weeklyMode) : 'none',
		skipDailyWhenWeeklyRuns: draft.skipDailyWhenWeeklyRuns,
	};
}

/**
 * normalizeQuestionDraft maps question draft state to a create/update request.
 */
export function normalizeQuestionDraft(
	draft: StandupQuestionDraft,
): CreateStandupQuestionRequest & UpdateStandupQuestionRequest {
	return {
		templateId: draft.templateId,
		section: draft.section.trim(),
		label: draft.label.trim(),
		helpText: draft.helpText.trim(),
		placeholder: draft.placeholder.trim(),
		type: draft.type,
		required: draft.required,
		showInReport: draft.showInReport,
		isPrivate: draft.isPrivate,
		createsTasks: draft.createsTasks,
		position: draft.position,
		options: parseQuestionOptions(draft.optionsText),
	};
}

/**
 * validateTemplateDraft validates template state before mutation.
 */
export function validateTemplateDraft(draft: StandupTemplateDraft): string | null {
	if (normalizeTemplateName(draft.name) === '') {
		return 'Template name is required.';
	}

	return null;
}

/**
 * normalizeTemplateName mirrors backend whitespace cleanup for template names.
 */
export function normalizeTemplateName(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

/**
 * templateNameKey creates a case-insensitive comparison key for unique names.
 */
export function templateNameKey(value: string): string {
	return normalizeTemplateName(value).toLowerCase();
}

/**
 * validateScheduleDraft validates schedule state before mutation.
 */
export function validateScheduleDraft(draft: StandupScheduleDraft): string | null {
	if (draft.templateId.trim() === '') {
		return 'Choose a template for this schedule.';
	}

	if (draft.timeOfDay.trim() === '') {
		return 'Choose a report time.';
	}

	return null;
}

/**
 * validateQuestionDraft validates dynamic question state before mutation.
 */
export function validateQuestionDraft(draft: StandupQuestionDraft): string | null {
	if (draft.templateId.trim() === '') {
		return 'Choose the template this question belongs to.';
	}

	if (draft.label.trim() === '') {
		return 'Question label is required.';
	}

	if (questionTypeNeedsOptions(draft.type) && parseQuestionOptions(draft.optionsText).length === 0) {
		return 'This question type needs at least one option.';
	}

	if (draft.createsTasks && draft.type !== 'text' && draft.type !== 'long_text') {
		return 'Only text and long-text questions can create tasks.';
	}

	return null;
}

/**
 * parseQuestionOptions returns unique option values from comma/newline input.
 */
export function parseQuestionOptions(value: string): readonly string[] {
	const options = value
		.split(/[\n,]+/)
		.map((option) => option.trim())
		.filter((option) => option !== '');

	return [...new Set(options)];
}

/**
 * questionTypeNeedsOptions reports whether a question type requires configured options.
 */
export function questionTypeNeedsOptions(type: QuestionType): boolean {
	return type === 'checkbox' || type === 'dropdown' || type === 'multi_select';
}

/**
 * replaceTemplate returns a list with one updated template.
 */
export function replaceTemplate(
	templates: readonly StandupTemplate[],
	updatedTemplate: StandupTemplate,
): readonly StandupTemplate[] {
	return templates.map((template) => (template.id === updatedTemplate.id ? updatedTemplate : template));
}

/**
 * replaceSchedule returns a list with one updated schedule.
 */
export function replaceSchedule(
	schedules: readonly StandupSchedule[],
	updatedSchedule: StandupSchedule,
): readonly StandupSchedule[] {
	return schedules.map((schedule) => (schedule.id === updatedSchedule.id ? updatedSchedule : schedule));
}

/**
 * replaceQuestion returns a list with one updated question.
 */
export function replaceQuestion(
	questions: readonly StandupQuestion[],
	updatedQuestion: StandupQuestion,
): readonly StandupQuestion[] {
	return questions.map((question) => (question.id === updatedQuestion.id ? updatedQuestion : question));
}

/**
 * sortTemplates returns templates in a predictable display order.
 */
export function sortTemplates(templates: readonly StandupTemplate[]): readonly StandupTemplate[] {
	return [...templates].sort((first, second) => {
		if (first.kind === second.kind) {
			return first.name.localeCompare(second.name);
		}

		return first.kind.localeCompare(second.kind);
	});
}

/**
 * sortSchedules returns schedules in kind and local-time order.
 */
export function sortSchedules(schedules: readonly StandupSchedule[]): readonly StandupSchedule[] {
	return [...schedules].sort((first, second) => {
		if (first.kind === second.kind) {
			return first.timeOfDay.localeCompare(second.timeOfDay);
		}

		return first.kind.localeCompare(second.kind);
	});
}

/**
 * sortQuestions returns questions in position order.
 */
export function sortQuestions(questions: readonly StandupQuestion[]): readonly StandupQuestion[] {
	return [...questions].sort((first, second) => {
		if (first.position === second.position) {
			return first.label.localeCompare(second.label);
		}

		return first.position - second.position;
	});
}

/**
 * groupQuestionsByTemplateID groups questions by template ID.
 */
export function groupQuestionsByTemplateID(
	questions: readonly StandupQuestion[],
): Readonly<Record<string, readonly StandupQuestion[]>> {
	const groups: Record<string, StandupQuestion[]> = {};

	for (const question of questions) {
		const group = groups[question.templateId] ?? [];
		group.push(question);
		groups[question.templateId] = group;
	}

	return mapRecordValues(groups, sortQuestions);
}

/**
 * groupSchedulesByTemplateID groups schedules by template ID.
 */
export function groupSchedulesByTemplateID(
	schedules: readonly StandupSchedule[],
): Readonly<Record<string, readonly StandupSchedule[]>> {
	const groups: Record<string, StandupSchedule[]> = {};

	for (const schedule of schedules) {
		const group = groups[schedule.templateId] ?? [];
		group.push(schedule);
		groups[schedule.templateId] = group;
	}

	return mapRecordValues(groups, sortSchedules);
}

/**
 * buildTemplateDetails combines templates with their attached questions and schedules.
 */
export function buildTemplateDetails(
	templates: readonly StandupTemplate[],
	questions: readonly StandupQuestion[],
	schedules: readonly StandupSchedule[],
): readonly StandupTemplateWithDetails[] {
	const questionsByTemplateID = groupQuestionsByTemplateID(questions);
	const schedulesByTemplateID = groupSchedulesByTemplateID(schedules);

	return sortTemplates(templates).map((template) => ({
		template,
		questions: questionsByTemplateID[template.id] ?? [],
		schedules: schedulesByTemplateID[template.id] ?? [],
	}));
}

/**
 * pairSchedulesWithDrafts combines schedules and editable drafts.
 */
export function pairSchedulesWithDrafts(
	schedules: readonly StandupSchedule[],
	drafts: StandupScheduleDraftsByID,
): readonly StandupScheduleWithDraft[] {
	return sortSchedules(schedules)
		.map((schedule) => {
			const draft = drafts[schedule.id];

			if (draft === undefined) {
				return null;
			}

			return { schedule, draft };
		})
		.filter((pair): pair is StandupScheduleWithDraft => pair !== null);
}

/**
 * pairTemplatesWithDrafts combines templates, questions, schedules, and editable drafts.
 */
export function pairTemplatesWithDrafts(
	templates: readonly StandupTemplate[],
	questions: readonly StandupQuestion[],
	schedules: readonly StandupSchedule[],
	templateDrafts: StandupTemplateDraftsByID,
	questionDrafts: StandupQuestionDraftsByID,
): readonly StandupTemplateWithDraft[] {
	const questionsByTemplateID = groupQuestionsByTemplateID(questions);
	const schedulesByTemplateID = groupSchedulesByTemplateID(schedules);

	return sortTemplates(templates)
		.map((template) => {
			const draft = templateDrafts[template.id];

			if (draft === undefined) {
				return null;
			}

			return {
				template,
				draft,
				questions: pairQuestionsWithDrafts(questionsByTemplateID[template.id] ?? [], questionDrafts),
				schedules: schedulesByTemplateID[template.id] ?? [],
			};
		})
		.filter((pair): pair is StandupTemplateWithDraft => pair !== null);
}

/**
 * pairQuestionsWithDrafts combines questions and editable drafts.
 */
export function pairQuestionsWithDrafts(
	questions: readonly StandupQuestion[],
	drafts: StandupQuestionDraftsByID,
): readonly StandupQuestionWithDraft[] {
	return sortQuestions(questions)
		.map((question) => {
			const draft = drafts[question.id];

			if (draft === undefined) {
				return null;
			}

			return { question, draft };
		})
		.filter((pair): pair is StandupQuestionWithDraft => pair !== null);
}

/**
 * templateHasChanges reports whether a template draft differs from persisted data.
 */
export function templateHasChanges(template: StandupTemplate, draft: StandupTemplateDraft): boolean {
	return (
		template.name !== draft.name ||
		template.description !== draft.description ||
		template.kind !== draft.kind ||
		template.isActive !== draft.isActive
	);
}

/**
 * scheduleHasChanges reports whether a schedule draft differs from persisted data.
 */
export function scheduleHasChanges(schedule: StandupSchedule, draft: StandupScheduleDraft): boolean {
	const normalizedDraft = normalizeScheduleDraft(draft);

	return (
		schedule.templateId !== normalizedDraft.templateId ||
		schedule.kind !== normalizedDraft.kind ||
		schedule.enabled !== normalizedDraft.enabled ||
		schedule.timeOfDay !== normalizedDraft.timeOfDay ||
		schedule.skipNonWorkingDays !== normalizedDraft.skipNonWorkingDays ||
		normalizeWeeklyMode(schedule.weeklyMode) !== normalizedDraft.weeklyMode ||
		schedule.skipDailyWhenWeeklyRuns !== normalizedDraft.skipDailyWhenWeeklyRuns
	);
}

/**
 * questionHasChanges reports whether a question draft differs from persisted data.
 */
export function questionHasChanges(question: StandupQuestion, draft: StandupQuestionDraft): boolean {
	const normalizedDraft = normalizeQuestionDraft(draft);

	return (
		question.templateId !== normalizedDraft.templateId ||
		question.section !== normalizedDraft.section ||
		question.label !== normalizedDraft.label ||
		question.helpText !== normalizedDraft.helpText ||
		question.placeholder !== normalizedDraft.placeholder ||
		question.type !== normalizedDraft.type ||
		question.required !== normalizedDraft.required ||
		question.showInReport !== normalizedDraft.showInReport ||
		question.isPrivate !== normalizedDraft.isPrivate ||
		question.createsTasks !== normalizedDraft.createsTasks ||
		question.position !== normalizedDraft.position ||
		question.options.join('\n') !== normalizedDraft.options.join('\n')
	);
}

/**
 * toStandupKind narrows unsafe select values to a supported standup kind.
 */
export function toStandupKind(value: string): StandupKind {
	if (value === 'weekly' || value === 'custom') {
		return value;
	}

	return 'daily';
}

/**
 * toQuestionType narrows unsafe select values to a supported question type.
 */
export function toQuestionType(value: string): QuestionType {
	if (SUPPORTED_QUESTION_TYPES.includes(value as QuestionType)) {
		return value as QuestionType;
	}

	return 'text';
}

/**
 * toWeeklyMode narrows unsafe select values to supported weekly modes.
 */
export function toWeeklyMode(value: string): WeeklyMode | 'none' {
	if (value === 'last_working_day') {
		return value;
	}

	return 'none';
}

/**
 * normalizeWeeklyMode returns an API-safe weekly mode.
 */
export function normalizeWeeklyMode(value: WeeklyMode | 'none' | ''): WeeklyMode | 'none' {
	if (value === 'last_working_day') {
		return value;
	}

	return 'none';
}

/**
 * nextQuestionPosition returns a coarse next position for a template.
 */
export function nextQuestionPosition(templateID: string, questions: readonly StandupQuestion[]): number {
	const positions = questions
		.filter((question) => question.templateId === templateID)
		.map((question) => question.position);

	if (positions.length === 0) {
		return 10;
	}

	return Math.max(...positions) + 10;
}

/**
 * activeTemplateCount returns active template count.
 */
export function activeTemplateCount(templates: readonly StandupTemplate[]): number {
	return templates.filter((template) => template.isActive).length;
}

/**
 * enabledScheduleCount returns enabled schedule count.
 */
export function enabledScheduleCount(schedules: readonly StandupSchedule[]): number {
	return schedules.filter((schedule) => schedule.enabled).length;
}

/**
 * dailyScheduleCount returns daily schedule count.
 */
export function dailyScheduleCount(schedules: readonly StandupSchedule[]): number {
	return schedules.filter((schedule) => schedule.kind === 'daily').length;
}

/**
 * weeklyScheduleCount returns weekly schedule count.
 */
export function weeklyScheduleCount(schedules: readonly StandupSchedule[]): number {
	return schedules.filter((schedule) => schedule.kind === 'weekly').length;
}

/**
 * reportQuestionCount returns questions shown in reports.
 */
export function reportQuestionCount(questions: readonly StandupQuestion[]): number {
	return questions.filter((question) => question.showInReport).length;
}

/**
 * shortID returns a compact ID label.
 */
export function shortID(value: string): string {
	if (value.length <= 8) {
		return value;
	}

	return value.slice(0, 8);
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
 * formatLabel converts enum-like values into readable labels.
 */
export function formatLabel(value: string): string {
	return value
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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

	return 'Could not update standup settings.';
}

/**
 * mapRecordValues returns a record with values transformed by mapper.
 */
function mapRecordValues<TValue, TNextValue>(
	record: Readonly<Record<string, readonly TValue[]>>,
	mapper: (values: readonly TValue[]) => readonly TNextValue[],
): Readonly<Record<string, readonly TNextValue[]>> {
	const nextRecord: Record<string, readonly TNextValue[]> = {};

	for (const [key, values] of Object.entries(record)) {
		nextRecord[key] = mapper(values);
	}

	return nextRecord;
}
