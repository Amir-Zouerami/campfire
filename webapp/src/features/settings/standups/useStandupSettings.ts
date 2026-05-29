import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import {
	createStandupQuestion,
	createStandupSchedule,
	createStandupTemplate,
	listStandupConfiguration,
	updateStandupQuestion,
	updateStandupSchedule,
	updateStandupTemplate,
} from '@/api';
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
	readonly createSchedule: () => Promise<void>;
	readonly saveSchedule: (schedule: StandupSchedule) => Promise<void>;
	readonly createQuestion: () => Promise<void>;
	readonly saveQuestion: (question: StandupQuestion) => Promise<void>;
};

/**
 * useStandupSettings owns settings loading, draft editing, and persistence.
 */
export function useStandupSettings(input: UseStandupSettingsInput): UseStandupSettingsResult {
	const [loadState, setLoadState] = useState<StandupSettingsLoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [templateDrafts, setTemplateDrafts] = useState<StandupTemplateDraftsByID>({});
	const [scheduleDrafts, setScheduleDrafts] = useState<StandupScheduleDraftsByID>({});
	const [questionDrafts, setQuestionDrafts] = useState<StandupQuestionDraftsByID>({});
	const [newTemplate, setNewTemplate] = useState<StandupTemplateDraft>(emptyTemplateDraft());
	const [newSchedule, setNewSchedule] = useState<StandupScheduleDraft>(emptyScheduleDraft());
	const [newQuestion, setNewQuestion] = useState<StandupQuestionDraft>(emptyQuestionDraft());
	const [savingID, setSavingID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadConfiguration loads templates, questions, and schedules together.
		 */
		async function loadConfiguration(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listStandupConfiguration(input.workspace.id, { includeInactive: true });

				if (!isActive) {
					return;
				}

				const firstTemplateID = response.templates[0]?.id ?? '';

				setTemplates(response.templates);
				setQuestions(response.questions);
				setSchedules(response.schedules);
				setTemplateDrafts(buildTemplateDrafts(response.templates));
				setScheduleDrafts(buildScheduleDrafts(response.schedules));
				setQuestionDrafts(buildQuestionDrafts(response.questions));
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
							: nextQuestionPosition(firstTemplateID, response.questions),
				}));
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadConfiguration();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken]);

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
	const isBusy = loadState === 'loading' || loadState === 'saving';

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
			showPermissionError('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const validationMessage = validateTemplateDraft(newTemplate);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		if (templateNameExists(templates, newTemplate.name)) {
			showValidationError('A standup template with this name already exists in this workspace.');
			return;
		}

		setLoadState('saving');
		setSavingID('new-template');
		setMessage('');

		try {
			const response = await createStandupTemplate(input.workspace.id, normalizeTemplateCreate(newTemplate));

			setTemplates(current => mergeTemplateWithActiveDailyRule([...current, response.template], response.template));
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
			finishMutation('Standup template created.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * saveTemplate updates an existing standup template.
	 */
	async function saveTemplate(template: StandupTemplate): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const draft = templateDrafts[template.id];
		if (draft === undefined) {
			showValidationError('Could not find this template draft.');
			return;
		}

		const validationMessage = validateTemplateDraft(draft);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		if (templateNameExists(templates, draft.name, template.id)) {
			showValidationError('A standup template with this name already exists in this workspace.');
			return;
		}

		setLoadState('saving');
		setSavingID(template.id);
		setMessage('');

		try {
			const response = await updateStandupTemplate(
				input.workspace.id,
				template.id,
				normalizeTemplateUpdate(draft),
			);

			setTemplates(current => mergeTemplateWithActiveDailyRule(replaceTemplate(current, response.template), response.template));
			setTemplateDrafts(current => ({ ...current, [response.template.id]: templateToDraft(response.template) }));
			finishMutation('Standup template updated.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * createSchedule creates a new standup schedule.
	 */
	async function createSchedule(): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		const validationMessage = validateScheduleDraft(newSchedule);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID('new-schedule');
		setMessage('');

		try {
			const response = await createStandupSchedule(input.workspace.id, normalizeScheduleDraft(newSchedule));

			setSchedules(current => [...current, response.schedule]);
			setScheduleDrafts(current => ({ ...current, [response.schedule.id]: scheduleToDraft(response.schedule) }));
			setNewSchedule(current => emptyScheduleDraft(current.templateId));
			finishMutation('Standup schedule created.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * saveSchedule updates an existing standup schedule.
	 */
	async function saveSchedule(schedule: StandupSchedule): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError('Only workspace Leads and system admins can manage standup schedules.');
			return;
		}

		const draft = scheduleDrafts[schedule.id];
		if (draft === undefined) {
			showValidationError('Could not find this schedule draft.');
			return;
		}

		const validationMessage = validateScheduleDraft(draft);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID(schedule.id);
		setMessage('');

		try {
			const response = await updateStandupSchedule(
				input.workspace.id,
				schedule.id,
				normalizeScheduleDraft(draft),
			);

			setSchedules(current => replaceSchedule(current, response.schedule));
			setScheduleDrafts(current => ({ ...current, [response.schedule.id]: scheduleToDraft(response.schedule) }));
			finishMutation('Standup schedule updated.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * createQuestion creates a new standup question.
	 */
	async function createQuestion(): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const validationMessage = validateQuestionDraft(newQuestion);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID('new-question');
		setMessage('');

		try {
			const response = await createStandupQuestion(input.workspace.id, normalizeQuestionDraft(newQuestion));

			setQuestions(current => [...current, response.question]);
			setQuestionDrafts(current => ({ ...current, [response.question.id]: questionToDraft(response.question) }));
			setNewQuestion(current =>
				emptyQuestionDraft(
					current.templateId,
					nextQuestionPosition(current.templateId, [...questions, response.question]),
				),
			);
			finishMutation('Standup question created.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * saveQuestion updates an existing standup question.
	 */
	async function saveQuestion(question: StandupQuestion): Promise<void> {
		if (!input.canManageStandups) {
			showPermissionError('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const draft = questionDrafts[question.id];
		if (draft === undefined) {
			showValidationError('Could not find this question draft.');
			return;
		}

		const validationMessage = validateQuestionDraft(draft);
		if (validationMessage !== null) {
			showValidationError(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID(question.id);
		setMessage('');

		try {
			const response = await updateStandupQuestion(
				input.workspace.id,
				question.id,
				normalizeQuestionDraft(draft),
			);

			setQuestions(current => replaceQuestion(current, response.question));
			setQuestionDrafts(current => ({ ...current, [response.question.id]: questionToDraft(response.question) }));
			finishMutation('Standup question updated.');
		} catch (error: unknown) {
			failMutation(error);
		}
	}

	/**
	 * showPermissionError displays an edit permission failure.
	 */
	function showPermissionError(errorMessage: string): void {
		setLoadState('error');
		setMessage(errorMessage);
	}

	/**
	 * showValidationError displays a validation failure.
	 */
	function showValidationError(errorMessage: string): void {
		setLoadState('error');
		setMessage(errorMessage);
	}

	/**
	 * finishMutation finalizes a successful mutation.
	 */
	function finishMutation(successMessage: string): void {
		setSavingID('');
		setLoadState('ready');
		setMessage(successMessage);
		toast.success(successMessage);
		input.onConfigurationChanged();
	}

	/**
	 * failMutation finalizes a failed mutation.
	 */
	function failMutation(error: unknown): void {
		const errorMessage = errorToMessage(error);

		setSavingID('');
		setLoadState('error');
		setMessage(errorMessage);
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
		message,
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
		createSchedule,
		saveSchedule,
		createQuestion,
		saveQuestion,
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