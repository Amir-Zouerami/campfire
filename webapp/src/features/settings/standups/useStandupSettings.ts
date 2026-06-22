import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import {
	createStandupQuestion,
	createStandupSchedule,
	createStandupTemplate,
	deleteStandupQuestion,
	deleteStandupSchedule,
	deleteStandupTemplate,
	listStandupConfiguration,
	updateStandupQuestion,
	updateStandupSchedule,
	updateStandupTemplate,
} from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { StandupQuestion, StandupSchedule, StandupTemplate, Workspace } from '@/types/domain';

import {
	activeTemplateCount,
	buildQuestionDrafts,
	buildScheduleDrafts,
	buildTemplateDetails,
	buildTemplateDrafts,
	dailyScheduleCount,
	emptyQuestionDraft,
	emptyScheduleDraft,
	emptyTemplateDraft,
	enabledScheduleCount,
	errorToMessage,
	nextQuestionPosition,
	normalizeQuestionDraft,
	normalizeScheduleDraft,
	normalizeTemplateCreate,
	normalizeTemplateUpdate,
	templateNameKey,
	pairSchedulesWithDrafts,
	pairTemplatesWithDrafts,
	questionToDraft,
	removeQuestion,
	removeQuestionsByTemplate,
	removeSchedule,
	removeSchedulesByTemplate,
	removeTemplate,
	replaceQuestion,
	replaceSchedule,
	replaceTemplate,
	reportQuestionCount,
	scheduleToDraft,
	sortQuestions,
	sortSchedules,
	sortTemplates,
	templateToDraft,
	validateQuestionDraft,
	validateScheduleDraft,
	validateTemplateDraft,
	weeklyScheduleCount,
} from './standup-settings.helpers';
import type {
	StandupQuestionDraft,
	StandupQuestionDraftPatch,
	StandupQuestionDraftsByID,
	StandupScheduleDraft,
	StandupScheduleDraftPatch,
	StandupScheduleDraftsByID,
	StandupScheduleWithDraft,
	StandupSettingsLoadState,
	StandupTemplateDraft,
	StandupTemplateDraftPatch,
	StandupTemplateDraftsByID,
	StandupTemplateWithDetails,
	StandupTemplateWithDraft,
} from './standup-settings.types';

/**
 * UseStandupSettingsInput contains workspace context and mutation permission.
 */
type UseStandupSettingsInput = {
	readonly workspace: Workspace;
	readonly canManageStandups: boolean;
	readonly refreshToken: number;
	readonly onConfigurationChanged: () => void;
};

/**
 * StandupSettingsSnapshot is the query-owned standup configuration aggregate.
 */
type StandupSettingsSnapshot = {
	readonly templates: readonly StandupTemplate[];
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
};

/**
 * UseStandupSettingsResult contains settings data, drafts, metrics, and actions.
 */
export type UseStandupSettingsResult = {
	readonly loadState: StandupSettingsLoadState;
	readonly templates: readonly StandupTemplate[];
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
	readonly sortedTemplates: readonly StandupTemplate[];
	readonly sortedQuestions: readonly StandupQuestion[];
	readonly sortedSchedules: readonly StandupSchedule[];
	readonly templateDetails: readonly StandupTemplateWithDetails[];
	readonly schedulesWithDrafts: readonly StandupScheduleWithDraft[];
	readonly templatesWithDrafts: readonly StandupTemplateWithDraft[];
	readonly templateDrafts: StandupTemplateDraftsByID;
	readonly scheduleDrafts: StandupScheduleDraftsByID;
	readonly questionDrafts: StandupQuestionDraftsByID;
	readonly newTemplate: StandupTemplateDraft;
	readonly newSchedule: StandupScheduleDraft;
	readonly newQuestion: StandupQuestionDraft;
	readonly savingID: string;
	readonly message: string;
	readonly isBusy: boolean;
	readonly activeTemplateCount: number;
	readonly enabledScheduleCount: number;
	readonly dailyScheduleCount: number;
	readonly weeklyScheduleCount: number;
	readonly reportQuestionCount: number;
	readonly updateNewTemplate: (patch: StandupTemplateDraftPatch) => void;
	readonly updateNewSchedule: (patch: StandupScheduleDraftPatch) => void;
	readonly updateNewQuestion: (patch: StandupQuestionDraftPatch) => void;
	readonly updateTemplateDraft: (templateID: string, patch: StandupTemplateDraftPatch) => void;
	readonly updateScheduleDraft: (scheduleID: string, patch: StandupScheduleDraftPatch) => void;
	readonly updateQuestionDraft: (questionID: string, patch: StandupQuestionDraftPatch) => void;
	readonly createTemplate: () => Promise<void>;
	readonly saveTemplate: (template: StandupTemplate) => Promise<void>;
	readonly deleteTemplate: (template: StandupTemplate) => Promise<boolean>;
	readonly createSchedule: () => Promise<void>;
	readonly saveSchedule: (schedule: StandupSchedule) => Promise<void>;
	readonly deleteSchedule: (schedule: StandupSchedule) => Promise<boolean>;
	readonly createQuestion: () => Promise<void>;
	readonly saveQuestion: (question: StandupQuestion) => Promise<void>;
	readonly deleteQuestion: (question: StandupQuestion) => Promise<boolean>;
};

/**
 * useStandupSettings owns standup configuration query state and editable drafts.
 */
export function useStandupSettings(input: UseStandupSettingsInput): UseStandupSettingsResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [templateDrafts, setTemplateDrafts] = useState<StandupTemplateDraftsByID>({});
	const [scheduleDrafts, setScheduleDrafts] = useState<StandupScheduleDraftsByID>({});
	const [questionDrafts, setQuestionDrafts] = useState<StandupQuestionDraftsByID>({});
	const [newTemplate, setNewTemplate] = useState<StandupTemplateDraft>(emptyTemplateDraft());
	const [newSchedule, setNewSchedule] = useState<StandupScheduleDraft>(emptyScheduleDraft());
	const [newQuestion, setNewQuestion] = useState<StandupQuestionDraft>(emptyQuestionDraft());
	const [savingID, setSavingID] = useState('');
	const [message, setMessage] = useState('');
	const [hasLocalError, setHasLocalError] = useState(false);

	const queryKey = campfireQueryKeys.standupSettingsConfiguration(input.workspace.id, input.refreshToken);
	const configurationQuery = useQuery({
		queryKey,
		queryFn: async (): Promise<StandupSettingsSnapshot> => {
			const response = await listStandupConfiguration(input.workspace.id, { includeInactive: true });

			return {
				templates: response.templates,
				questions: response.questions,
				schedules: response.schedules,
			};
		},
	});

	useEffect(() => {
		const snapshot = configurationQuery.data;
		if (snapshot === undefined) {
			return;
		}

		const firstTemplateID = snapshot.templates[0]?.id ?? '';
		setTemplateDrafts(buildTemplateDrafts(snapshot.templates));
		setScheduleDrafts(buildScheduleDrafts(snapshot.schedules));
		setQuestionDrafts(buildQuestionDrafts(snapshot.questions));
		setNewSchedule(current => ({
			...current,
			templateId: current.templateId.trim() !== '' ? current.templateId : firstTemplateID,
		}));
		setNewQuestion(current => ({
			...current,
			templateId: current.templateId.trim() !== '' ? current.templateId : firstTemplateID,
			position:
				current.position > 0
					? current.position
					: nextQuestionPosition(firstTemplateID, snapshot.questions),
		}));
	}, [configurationQuery.data]);

	const templates = configurationQuery.data?.templates ?? [];
	const questions = configurationQuery.data?.questions ?? [];
	const schedules = configurationQuery.data?.schedules ?? [];

	const createTemplateMutation = useMutation({
		mutationFn: async () => createStandupTemplate(input.workspace.id, normalizeTemplateCreate(newTemplate)),
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				templates: mergeTemplateWithActiveDailyRule([...snapshot.templates, response.template], response.template),
			}));
			setTemplateDrafts(current => ({ ...current, [response.template.id]: templateToDraft(response.template) }));
			setNewTemplate(emptyTemplateDraft());
			setNewSchedule(current => ({
				...current,
				templateId: current.templateId.trim() !== '' ? current.templateId : response.template.id,
			}));
			setNewQuestion(current => ({
				...current,
				templateId: current.templateId.trim() !== '' ? current.templateId : response.template.id,
			}));
			finishMutation(t('settings.standups.toast.templateCreated'));
		},
		onError: failMutation,
	});

	const updateTemplateMutation = useMutation({
		mutationFn: async (template: StandupTemplate) => {
			const draft = templateDrafts[template.id];
			if (draft === undefined) {
				throw new Error(t('settings.standups.error.templateDraftMissing'));
			}

			return updateStandupTemplate(input.workspace.id, template.id, normalizeTemplateUpdate(draft));
		},
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				templates: mergeTemplateWithActiveDailyRule(
					replaceTemplate(snapshot.templates, response.template),
					response.template,
				),
			}));
			setTemplateDrafts(current => ({ ...current, [response.template.id]: templateToDraft(response.template) }));
			finishMutation(t('settings.standups.toast.templateUpdated'));
		},
		onError: failMutation,
	});

	const deleteTemplateMutation = useMutation({
		mutationFn: async (template: StandupTemplate) => {
			await deleteStandupTemplate(input.workspace.id, template.id);

			return template;
		},
		onSuccess: template => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				templates: removeTemplate(snapshot.templates, template.id),
				questions: removeQuestionsByTemplate(snapshot.questions, template.id),
				schedules: removeSchedulesByTemplate(snapshot.schedules, template.id),
			}));
			setTemplateDrafts(current => removeDraft(current, template.id));
			setQuestionDrafts(current => removeDraftsByQuestionTemplate(current, questions, template.id));
			setScheduleDrafts(current => removeDraftsByScheduleTemplate(current, schedules, template.id));
			finishMutation(t('settings.standups.toast.templateDeleted'));
		},
		onError: failMutation,
	});

	const createScheduleMutation = useMutation({
		mutationFn: async () => createStandupSchedule(input.workspace.id, normalizeScheduleDraft(newSchedule)),
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				schedules: [...snapshot.schedules, response.schedule],
			}));
			setScheduleDrafts(current => ({ ...current, [response.schedule.id]: scheduleToDraft(response.schedule) }));
			setNewSchedule(current => emptyScheduleDraft(current.templateId));
			finishMutation(t('settings.standups.toast.scheduleCreated'));
		},
		onError: failMutation,
	});

	const updateScheduleMutation = useMutation({
		mutationFn: async (schedule: StandupSchedule) => {
			const draft = scheduleDrafts[schedule.id];
			if (draft === undefined) {
				throw new Error(t('settings.standups.error.scheduleDraftMissing'));
			}

			return updateStandupSchedule(input.workspace.id, schedule.id, normalizeScheduleDraft(draft));
		},
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				schedules: replaceSchedule(snapshot.schedules, response.schedule),
			}));
			setScheduleDrafts(current => ({ ...current, [response.schedule.id]: scheduleToDraft(response.schedule) }));
			finishMutation(t('settings.standups.toast.scheduleUpdated'));
		},
		onError: failMutation,
	});

	const deleteScheduleMutation = useMutation({
		mutationFn: async (schedule: StandupSchedule) => {
			await deleteStandupSchedule(input.workspace.id, schedule.id);

			return schedule;
		},
		onSuccess: schedule => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				schedules: removeSchedule(snapshot.schedules, schedule.id),
			}));
			setScheduleDrafts(current => removeDraft(current, schedule.id));
			finishMutation(t('settings.standups.toast.scheduleDeleted'));
		},
		onError: failMutation,
	});

	const createQuestionMutation = useMutation({
		mutationFn: async () => createStandupQuestion(input.workspace.id, normalizeQuestionDraft(newQuestion)),
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				questions: [...snapshot.questions, response.question],
			}));
			setQuestionDrafts(current => ({ ...current, [response.question.id]: questionToDraft(response.question) }));
			setNewQuestion(current =>
				emptyQuestionDraft(
					current.templateId,
					nextQuestionPosition(current.templateId, [...questions, response.question]),
				),
			);
			finishMutation(t('settings.standups.toast.questionCreated'));
		},
		onError: failMutation,
	});

	const updateQuestionMutation = useMutation({
		mutationFn: async (question: StandupQuestion) => {
			const draft = questionDrafts[question.id];
			if (draft === undefined) {
				throw new Error(t('settings.standups.error.questionDraftMissing'));
			}

			return updateStandupQuestion(input.workspace.id, question.id, normalizeQuestionDraft(draft));
		},
		onSuccess: response => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				questions: replaceQuestion(snapshot.questions, response.question),
			}));
			setQuestionDrafts(current => ({ ...current, [response.question.id]: questionToDraft(response.question) }));
			finishMutation(t('settings.standups.toast.questionUpdated'));
		},
		onError: failMutation,
	});

	const deleteQuestionMutation = useMutation({
		mutationFn: async (question: StandupQuestion) => {
			await deleteStandupQuestion(input.workspace.id, question.id);

			return question;
		},
		onSuccess: question => {
			updateSnapshot(queryClient, queryKey, snapshot => ({
				...snapshot,
				questions: removeQuestion(snapshot.questions, question.id),
			}));
			setQuestionDrafts(current => removeDraft(current, question.id));
			finishMutation(t('settings.standups.toast.questionDeleted'));
		},
		onError: failMutation,
	});

	const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
	const sortedQuestions = useMemo(() => sortQuestions(questions), [questions]);
	const sortedSchedules = useMemo(() => sortSchedules(schedules), [schedules]);
	const templateDetails = useMemo(
		() => buildTemplateDetails(templates, questions, schedules),
		[templates, questions, schedules],
	);
	const schedulesWithDrafts = useMemo(
		() => pairSchedulesWithDrafts(schedules, scheduleDrafts),
		[schedules, scheduleDrafts],
	);
	const templatesWithDrafts = useMemo(
		() => pairTemplatesWithDrafts(templates, questions, schedules, templateDrafts, questionDrafts),
		[templates, questions, schedules, templateDrafts, questionDrafts],
	);
	const activeCount = useMemo(() => activeTemplateCount(templates), [templates]);
	const enabledCount = useMemo(() => enabledScheduleCount(schedules), [schedules]);
	const dailyCount = useMemo(() => dailyScheduleCount(schedules), [schedules]);
	const weeklyCount = useMemo(() => weeklyScheduleCount(schedules), [schedules]);
	const reportCount = useMemo(() => reportQuestionCount(questions), [questions]);
	const mutationPending =
		createTemplateMutation.isPending ||
		updateTemplateMutation.isPending ||
		deleteTemplateMutation.isPending ||
		createScheduleMutation.isPending ||
		updateScheduleMutation.isPending ||
		deleteScheduleMutation.isPending ||
		createQuestionMutation.isPending ||
		updateQuestionMutation.isPending ||
		deleteQuestionMutation.isPending;
	const loadState = deriveStandupSettingsLoadState(configurationQuery.isLoading, configurationQuery.isError, mutationPending, hasLocalError);
	const isBusy = configurationQuery.isLoading || mutationPending;
	const currentMessage = configurationQuery.isError ? errorToMessage(configurationQuery.error, t('settings.standups.error.fallback')) : message;

	/**
	 * updateNewTemplate patches the create-template draft.
	 */
	function updateNewTemplate(patch: StandupTemplateDraftPatch): void {
		setNewTemplate(current => ({ ...current, ...patch }));
	}

	/**
	 * updateNewSchedule patches the create-schedule draft.
	 */
	function updateNewSchedule(patch: StandupScheduleDraftPatch): void {
		setNewSchedule(current => ({ ...current, ...patch }));
	}

	/**
	 * updateNewQuestion patches the create-question draft.
	 */
	function updateNewQuestion(patch: StandupQuestionDraftPatch): void {
		setNewQuestion(current => ({ ...current, ...patch }));
	}

	/**
	 * updateTemplateDraft patches one existing template draft.
	 */
	function updateTemplateDraft(templateID: string, patch: StandupTemplateDraftPatch): void {
		setTemplateDrafts(current => patchDraft(current, templateID, patch));
	}

	/**
	 * updateScheduleDraft patches one existing schedule draft.
	 */
	function updateScheduleDraft(scheduleID: string, patch: StandupScheduleDraftPatch): void {
		setScheduleDrafts(current => patchDraft(current, scheduleID, patch));
	}

	/**
	 * updateQuestionDraft patches one existing question draft.
	 */
	function updateQuestionDraft(questionID: string, patch: StandupQuestionDraftPatch): void {
		setQuestionDrafts(current => patchDraft(current, questionID, patch));
	}

	/**
	 * createTemplate creates a new standup template.
	 */
	async function createTemplate(): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.forms'));
			return;
		}

		const validationMessage = validateTemplateDraft(newTemplate, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		if (templateNameExists(templates, newTemplate.name)) {
			showValidationError(t('settings.standups.validation.templateNameDuplicate'));
			return;
		}

		startMutation('new-template');
		await createTemplateMutation.mutateAsync().catch(() => undefined);
	}

	/**
	 * saveTemplate updates an existing standup template.
	 */
	async function saveTemplate(template: StandupTemplate): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.forms'));
			return;
		}

		const draft = templateDrafts[template.id];
		if (draft === undefined) {
			showValidationError(t('settings.standups.error.templateDraftMissing'));
			return;
		}

		const validationMessage = validateTemplateDraft(draft, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		if (templateNameExists(templates, draft.name, template.id)) {
			showValidationError(t('settings.standups.validation.templateNameDuplicate'));
			return;
		}

		startMutation(template.id);
		await updateTemplateMutation.mutateAsync(template).catch(() => undefined);
	}

	/**
	 * deleteTemplate removes one template and its dependent standup configuration/history.
	 */
	async function deleteTemplate(template: StandupTemplate): Promise<boolean> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.deleteForms'));
			return false;
		}

		startMutation(`delete-template-${template.id}`);
		return deleteTemplateMutation
			.mutateAsync(template)
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * createSchedule creates a new standup schedule.
	 */
	async function createSchedule(): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.schedules'));
			return;
		}

		const validationMessage = validateScheduleDraft(newSchedule, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		startMutation('new-schedule');
		await createScheduleMutation.mutateAsync().catch(() => undefined);
	}

	/**
	 * saveSchedule updates an existing standup schedule.
	 */
	async function saveSchedule(schedule: StandupSchedule): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.schedules'));
			return;
		}

		const draft = scheduleDrafts[schedule.id];
		if (draft === undefined) {
			showValidationError(t('settings.standups.error.scheduleDraftMissing'));
			return;
		}

		const validationMessage = validateScheduleDraft(draft, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		startMutation(schedule.id);
		await updateScheduleMutation.mutateAsync(schedule).catch(() => undefined);
	}

	/**
	 * deleteSchedule removes one schedule and schedule-scoped generated rows.
	 */
	async function deleteSchedule(schedule: StandupSchedule): Promise<boolean> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.deleteSchedules'));
			return false;
		}

		startMutation(`delete-schedule-${schedule.id}`);
		return deleteScheduleMutation
			.mutateAsync(schedule)
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * createQuestion creates a new standup question.
	 */
	async function createQuestion(): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.forms'));
			return;
		}

		const validationMessage = validateQuestionDraft(newQuestion, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		startMutation('new-question');
		await createQuestionMutation.mutateAsync().catch(() => undefined);
	}

	/**
	 * saveQuestion updates an existing standup question.
	 */
	async function saveQuestion(question: StandupQuestion): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.forms'));
			return;
		}

		const draft = questionDrafts[question.id];
		if (draft === undefined) {
			showValidationError(t('settings.standups.error.questionDraftMissing'));
			return;
		}

		const validationMessage = validateQuestionDraft(draft, t);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		startMutation(question.id);
		await updateQuestionMutation.mutateAsync(question).catch(() => undefined);
	}

	/**
	 * deleteQuestion removes one question and stored answers attached to it.
	 */
	async function deleteQuestion(question: StandupQuestion): Promise<boolean> {
		if (!input.canManageStandups) {
			showPermissionError(t('settings.standups.error.permission.deleteQuestions'));
			return false;
		}

		startMutation(`delete-question-${question.id}`);
		return deleteQuestionMutation
			.mutateAsync(question)
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * startMutation resets feedback and stores which row is mutating.
	 */
	function startMutation(nextSavingID: string): void {
		setSavingID(nextSavingID);
		setMessage('');
		setHasLocalError(false);
	}

	/**
	 * showPermissionError displays an edit permission failure.
	 */
	function showPermissionError(errorMessage: string): void {
		setSavingID('');
		setMessage(errorMessage);
		setHasLocalError(true);
	}

	/**
	 * showValidationError displays a validation failure.
	 */
	function showValidationError(errorMessage: string): void {
		setSavingID('');
		setMessage(errorMessage);
		setHasLocalError(true);
	}

	/**
	 * finishMutation finalizes a successful mutation.
	 */
	function finishMutation(successMessage: string): void {
		setSavingID('');
		setMessage(successMessage);
		setHasLocalError(false);
		toast.success(successMessage);
		void queryClient.invalidateQueries({ queryKey: campfireQueryKeys.standupSettings(input.workspace.id) });
		input.onConfigurationChanged();
	}

	/**
	 * failMutation finalizes a failed mutation.
	 */
	function failMutation(error: unknown): void {
		const errorMessage = errorToMessage(error, t('settings.standups.error.fallback'));

		setSavingID('');
		setMessage(errorMessage);
		setHasLocalError(true);
		toast.error(errorMessage);
	}

	return {
		loadState,
		templates,
		questions,
		schedules,
		sortedTemplates,
		sortedQuestions,
		sortedSchedules,
		templateDetails,
		schedulesWithDrafts,
		templatesWithDrafts,
		templateDrafts,
		scheduleDrafts,
		questionDrafts,
		newTemplate,
		newSchedule,
		newQuestion,
		savingID,
		message: currentMessage,
		isBusy,
		activeTemplateCount: activeCount,
		enabledScheduleCount: enabledCount,
		dailyScheduleCount: dailyCount,
		weeklyScheduleCount: weeklyCount,
		reportQuestionCount: reportCount,
		updateNewTemplate,
		updateNewSchedule,
		updateNewQuestion,
		updateTemplateDraft,
		updateScheduleDraft,
		updateQuestionDraft,
		createTemplate,
		saveTemplate,
		deleteTemplate,
		createSchedule,
		saveSchedule,
		deleteSchedule,
		createQuestion,
		saveQuestion,
		deleteQuestion,
	};
}

/**
 * templateNameExists checks the workspace-unique template-name rule locally so
 * the UI can fail fast before the backend enforces the same rule.
 */
function templateNameExists(
	templates: readonly StandupTemplate[],
	name: string,
	excludedTemplateID = '',
): boolean {
	const nextKey = templateNameKey(name);
	if (nextKey === '') {
		return false;
	}

	return templates.some(template => template.id !== excludedTemplateID && templateNameKey(template.name) === nextKey);
}

/**
 * updateSnapshot writes a derived standup settings snapshot into the query cache.
 */
function updateSnapshot(
	queryClient: QueryClient,
	queryKey: ReturnType<typeof campfireQueryKeys.standupSettingsConfiguration>,
	mapper: (snapshot: StandupSettingsSnapshot) => StandupSettingsSnapshot,
): void {
	queryClient.setQueryData<StandupSettingsSnapshot>(queryKey, current => {
		if (current === undefined) {
			return current;
		}

		return mapper(current);
	});
}

/**
 * mergeTemplateWithActiveDailyRule mirrors the backend rule in local state so
 * the previous active daily template visually deactivates immediately.
 */
function mergeTemplateWithActiveDailyRule(
	templates: readonly StandupTemplate[],
	changedTemplate: StandupTemplate,
): readonly StandupTemplate[] {
	if (changedTemplate.kind !== 'daily' || !changedTemplate.isActive) {
		return templates;
	}

	return templates.map(template => {
		if (template.id === changedTemplate.id) {
			return changedTemplate;
		}

		if (template.kind !== 'daily' || !template.isActive) {
			return template;
		}

		return {
			...template,
			isActive: false,
		};
	});
}

/**
 * patchDraft safely patches a draft lookup by ID.
 */
function patchDraft<TDraft extends object, TPatch extends Partial<TDraft>>(
	drafts: Record<string, TDraft>,
	id: string,
	patch: TPatch,
): Record<string, TDraft> {
	const draft = drafts[id];

	if (draft === undefined) {
		return drafts;
	}

	return {
		...drafts,
		[id]: {
			...draft,
			...patch,
		},
	};
}

/**
 * removeDraft removes one draft entry without mutating the current lookup.
 */
function removeDraft<TDraft>(drafts: Record<string, TDraft>, id: string): Record<string, TDraft> {
	const next = { ...drafts };
	delete next[id];

	return next;
}

/**
 * removeDraftsByQuestionTemplate removes all question drafts for one template.
 */
function removeDraftsByQuestionTemplate(
	drafts: StandupQuestionDraftsByID,
	currentQuestions: readonly StandupQuestion[],
	templateID: string,
): StandupQuestionDraftsByID {
	const next = { ...drafts };

	for (const question of currentQuestions) {
		if (question.templateId === templateID) {
			delete next[question.id];
		}
	}

	return next;
}

/**
 * removeDraftsByScheduleTemplate removes all schedule drafts that point at one template.
 */
function removeDraftsByScheduleTemplate(
	drafts: StandupScheduleDraftsByID,
	currentSchedules: readonly StandupSchedule[],
	templateID: string,
): StandupScheduleDraftsByID {
	const next = { ...drafts };

	for (const schedule of currentSchedules) {
		if (schedule.templateId === templateID) {
			delete next[schedule.id];
		}
	}

	return next;
}

/**
 * deriveStandupSettingsLoadState maps query and mutation state to the existing UI contract.
 */
function deriveStandupSettingsLoadState(
	isLoading: boolean,
	isQueryError: boolean,
	isMutating: boolean,
	hasLocalError: boolean,
): StandupSettingsLoadState {
	if (isLoading) {
		return 'loading';
	}

	if (isMutating) {
		return 'saving';
	}

	if (isQueryError || hasLocalError) {
		return 'error';
	}

	return 'ready';
}
