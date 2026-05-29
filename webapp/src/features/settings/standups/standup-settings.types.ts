import type {
	QuestionType,
	StandupKind,
	StandupQuestion,
	StandupSchedule,
	StandupTemplate,
	WeeklyMode,
} from '@/types/domain';

/**
 * StandupSettingsLoadState describes settings loading and mutation state.
 */
export type StandupSettingsLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * StandupTemplateDraft contains editable template fields.
 */
export type StandupTemplateDraft = {
	readonly name: string;
	readonly description: string;
	readonly kind: StandupKind;
	readonly isActive: boolean;
};

/**
 * StandupScheduleDraft contains editable schedule fields.
 */
export type StandupScheduleDraft = {
	readonly templateId: string;
	readonly kind: StandupKind;
	readonly enabled: boolean;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: WeeklyMode | 'none' | '';
	readonly skipDailyWhenWeeklyRuns: boolean;
};

/**
 * StandupQuestionDraft contains editable dynamic-form question fields.
 */
export type StandupQuestionDraft = {
	readonly templateId: string;
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
 * StandupTemplateDraftPatch is a partial template edit.
 */
export type StandupTemplateDraftPatch = Partial<StandupTemplateDraft>;

/**
 * StandupScheduleDraftPatch is a partial schedule edit.
 */
export type StandupScheduleDraftPatch = Partial<StandupScheduleDraft>;

/**
 * StandupQuestionDraftPatch is a partial question edit.
 */
export type StandupQuestionDraftPatch = Partial<StandupQuestionDraft>;

/**
 * StandupTemplateDraftsByID stores template drafts by template ID.
 */
export type StandupTemplateDraftsByID = Record<string, StandupTemplateDraft>;

/**
 * StandupScheduleDraftsByID stores schedule drafts by schedule ID.
 */
export type StandupScheduleDraftsByID = Record<string, StandupScheduleDraft>;

/**
 * StandupQuestionDraftsByID stores question drafts by question ID.
 */
export type StandupQuestionDraftsByID = Record<string, StandupQuestionDraft>;

/**
 * StandupTemplateWithDetails contains one template and its attached settings.
 */
export type StandupTemplateWithDetails = {
	readonly template: StandupTemplate;
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
};

/**
 * StandupScheduleWithDraft contains one schedule and its editable draft.
 */
export type StandupScheduleWithDraft = {
	readonly schedule: StandupSchedule;
	readonly draft: StandupScheduleDraft;
};

/**
 * StandupTemplateWithDraft contains one template and its editable draft.
 */
export type StandupTemplateWithDraft = {
	readonly template: StandupTemplate;
	readonly draft: StandupTemplateDraft;
	readonly questions: readonly StandupQuestionWithDraft[];
	readonly schedules: readonly StandupSchedule[];
};

/**
 * StandupQuestionWithDraft contains one question and its editable draft.
 */
export type StandupQuestionWithDraft = {
	readonly question: StandupQuestion;
	readonly draft: StandupQuestionDraft;
};
