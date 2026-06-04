import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { evaluateStandupDay, getMyStandupSubmission, listMyTasks, listStandupConfiguration, submitStandup } from '@/api';
import type { StandupAnswer, StandupQuestion, StandupRunDecision, StandupSchedule, StandupTemplate, Task, Workspace } from '@/types/domain';

import {
	buildInitialAnswers,
	enabledOrFirstSchedule,
	errorToMessage,
	findTemplateForSchedule,
	getTodayLocalDateString,
	normalizeAnswerValue,
	questionsForTemplate,
	validateRequiredAnswers,
} from './my-standup.helpers';
import type { AnswerDrafts, AnswerDraftValue, MyStandupLoadState } from './my-standup.types';

/**
 * UseMyStandupInput contains external data needed by the standup hook.
 */
type UseMyStandupInput = {
	readonly workspace: Workspace;
	readonly onStandupSubmitted: () => void;
};

/**
 * UseMyStandupResult contains all state/actions needed by the standup page.
 */
export type UseMyStandupResult = {
	readonly loadState: MyStandupLoadState;
	readonly templates: readonly StandupTemplate[];
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
	readonly availableSchedules: readonly StandupSchedule[];
	readonly tasks: readonly Task[];
	readonly runtimeDecision: StandupRunDecision | null;
	readonly canSubmitToday: boolean;
	readonly selectedSchedule: StandupSchedule | null;
	readonly selectedTemplate: StandupTemplate | null;
	readonly visibleQuestions: readonly StandupQuestion[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly today: string;
	readonly answers: AnswerDrafts;
	readonly message: string;
	readonly isBusy: boolean;
	readonly dateBlockedMessage: string;
	readonly handleDateChange: (date: string) => void;
	readonly handleScheduleChange: (scheduleID: string) => void;
	readonly updateAnswer: (questionID: string, value: AnswerDraftValue) => void;
	readonly submitCurrentStandup: () => Promise<void>;
};

/**
 * useMyStandup owns loading, draft state, validation, runtime checks, date
 * eligibility, and submission for the My Day check-in form.
 */
export function useMyStandup(input: UseMyStandupInput): UseMyStandupResult {
	const today = useMemo(() => todayForWorkspace(input.workspace.timezone), [input.workspace.timezone]);
	const [loadState, setLoadState] = useState<MyStandupLoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [tasks, setTasks] = useState<readonly Task[]>([]);
	const [runtimeDecision, setRuntimeDecision] = useState<StandupRunDecision | null>(null);
	const [selectedScheduleID, setSelectedScheduleID] = useState('');
	const [occurrenceDate, setOccurrenceDate] = useState(today);
	const [answers, setAnswers] = useState<AnswerDrafts>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		setOccurrenceDate(today);
	}, [today]);

	useEffect(() => {
		let isActive = true;

		/**
		 * loadInitialData loads standup configuration and personal tasks used for
		 * duplicate-aware work-item suggestions.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [configurationResponse, tasksResponse] = await Promise.all([
					listStandupConfiguration(input.workspace.id),
					listMyTasks(input.workspace.id, true),
				]);

				if (!isActive) {
					return;
				}

				const firstSchedule = enabledOrFirstSchedule(configurationResponse.schedules);

				setTemplates(configurationResponse.templates);
				setQuestions(configurationResponse.questions);
				setSchedules(configurationResponse.schedules);
				setTasks(tasksResponse.tasks);
				setSelectedScheduleID(firstSchedule?.id ?? '');
				setAnswers(
					firstSchedule === null ? {} : buildInitialAnswers(configurationResponse.questions, firstSchedule.templateId),
				);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadInitialData();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id]);

	useEffect(() => {
		let isActive = true;

		/**
		 * loadRuntimeDecision evaluates the selected date against workspace working
		 * days, off-days, global off-days, and leave coverage.
		 */
		async function loadRuntimeDecision(): Promise<void> {
			if (occurrenceDate.trim() === '') {
				setRuntimeDecision(null);
				return;
			}

			try {
				const response = await evaluateStandupDay(input.workspace.id, occurrenceDate);
				if (isActive) {
					setRuntimeDecision(response.decision);
				}
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setRuntimeDecision(null);
				toast.error(errorToMessage(error));
			}
		}

		void loadRuntimeDecision();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, occurrenceDate]);

	const availableSchedules = useMemo(() => {
		return schedules.filter(schedule => scheduleAllowsDate(schedule, schedules, runtimeDecision));
	}, [runtimeDecision, schedules]);

	useEffect(() => {
		if (availableSchedules.length === 0) {
			return;
		}

		if (availableSchedules.some(schedule => schedule.id === selectedScheduleID)) {
			return;
		}

		const nextSchedule = availableSchedules[0];
		if (nextSchedule !== undefined) {
			setSelectedScheduleID(nextSchedule.id);
			setAnswers(buildInitialAnswers(questions, nextSchedule.templateId));
		}
	}, [availableSchedules, questions, selectedScheduleID]);

	const selectedSchedule = useMemo(() => {
		return availableSchedules.find(schedule => schedule.id === selectedScheduleID) ?? null;
	}, [availableSchedules, selectedScheduleID]);

	const selectedTemplate = useMemo(() => {
		return findTemplateForSchedule(templates, selectedSchedule);
	}, [templates, selectedSchedule]);

	const visibleQuestions = useMemo(() => {
		return questionsForTemplate(questions, selectedTemplate);
	}, [questions, selectedTemplate]);

	useEffect(() => {
		let isActive = true;

		/**
		 * loadStoredSubmission loads prior answers for the selected date/template so
		 * members can correct previous standups instead of overwriting a blank form.
		 */
		async function loadStoredSubmission(): Promise<void> {
			if (selectedTemplate === null || occurrenceDate.trim() === '' || occurrenceDate > today) {
				return;
			}

			try {
				const response = await getMyStandupSubmission({
					workspaceId: input.workspace.id,
					occurrenceDate,
					templateId: selectedTemplate.id,
				});

				if (!isActive) {
					return;
				}

				if (response.submission === null) {
					setAnswers(buildInitialAnswers(questions, selectedTemplate.id));
					return;
				}

				setAnswers(storedAnswersToDrafts(visibleQuestions, response.answers));
				setMessage(`Editing saved standup from ${occurrenceDate}. Last updated ${formatSubmittedAt(response.submission.lastUpdatedAt)}.`);
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				toast.error(errorToMessage(error));
			}
		}

		void loadStoredSubmission();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, occurrenceDate, questions, selectedTemplate, today, visibleQuestions]);

	const isBusy = loadState === 'loading' || loadState === 'saving';
	const dateBlockedMessage = blockedDateMessage(occurrenceDate, today, runtimeDecision, availableSchedules);
	const canSubmitToday = dateBlockedMessage === '' && selectedSchedule !== null;

	/**
	 * handleDateChange lets members correct previous standups while still keeping
	 * future/off-day/non-working-day submissions blocked.
	 */
	const handleDateChange = useCallback((date: string): void => {
		setOccurrenceDate(date);
		setMessage('');
	}, []);

	/**
	 * handleScheduleChange changes selected schedule and rebuilds answer drafts.
	 */
	const handleScheduleChange = useCallback((scheduleID: string): void => {
		const nextSchedule = availableSchedules.find(schedule => schedule.id === scheduleID) ?? null;

		setSelectedScheduleID(scheduleID);
		setAnswers(nextSchedule === null ? {} : buildInitialAnswers(questions, nextSchedule.templateId));
	}, [availableSchedules, questions]);

	/**
	 * updateAnswer updates one answer draft.
	 */
	const updateAnswer = useCallback((questionID: string, value: AnswerDraftValue): void => {
		setAnswers(current => {
			if (answerDraftValuesEqual(current[questionID], value)) {
				return current;
			}

			return {
				...current,
				[questionID]: value,
			};
		});
	}, []);

	/**
	 * submitCurrentStandup validates and submits the current answer draft.
	 */
	async function submitCurrentStandup(): Promise<void> {
		if (dateBlockedMessage !== '') {
			setMessage(dateBlockedMessage);
			setLoadState('error');
			toast.error(dateBlockedMessage);
			return;
		}

		if (selectedSchedule === null || selectedTemplate === null) {
			const scheduleMessage = 'Choose a standup schedule before submitting.';
			setMessage(scheduleMessage);
			setLoadState('error');
			return;
		}

		const validationMessage = validateRequiredAnswers(visibleQuestions, answers);
		if (validationMessage !== null) {
			setMessage(validationMessage);
			setLoadState('error');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await submitStandup({
				workspaceId: input.workspace.id,
				templateId: selectedTemplate.id,
				scheduleId: selectedSchedule.id,
				occurrenceDate,
				answers: visibleQuestions.map(question => ({
					questionId: question.id,
					valueJson: JSON.stringify(normalizeAnswerValue(question, answers[question.id])),
				})),
			});

			const createdTaskCount = response.createdTasks.length;
			const updatedAt = formatSubmittedAt(response.submission.lastUpdatedAt);
			const successMessage = createdTaskCount > 0
				? `Standup saved. ${createdTaskCount} ${createdTaskCount === 1 ? 'task' : 'tasks'} created from work items. Updated ${updatedAt}.`
				: `Standup saved. Updated ${updatedAt}.`;

			setLoadState('ready');
			setMessage(successMessage);
			toast.success(successMessage);
			input.onStandupSubmitted();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		templates,
		questions,
		schedules,
		availableSchedules,
		tasks,
		runtimeDecision,
		canSubmitToday,
		selectedSchedule,
		selectedTemplate,
		visibleQuestions,
		selectedScheduleID,
		occurrenceDate,
		today,
		answers,
		message,
		isBusy,
		dateBlockedMessage,
		handleDateChange,
		handleScheduleChange,
		updateAnswer,
		submitCurrentStandup,
	};
}

/**
 * answerDraftValuesEqual compares editable answer values without forcing a
 * whole-form re-render when a control emits the same value it already holds.
 */
function answerDraftValuesEqual(left: AnswerDraftValue | undefined, right: AnswerDraftValue): boolean {
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
			return false;
		}

		return left.every((value, index) => value === right[index]);
	}

	return left === right;
}

/**
 * storedAnswersToDrafts maps API answer rows back into editable draft values.
 */
function storedAnswersToDrafts(
	questions: readonly StandupQuestion[],
	storedAnswers: readonly StandupAnswer[],
): AnswerDrafts {
	const drafts: Record<string, AnswerDraftValue> = {};
	const answerByQuestionID = new Map(storedAnswers.map(answer => [answer.questionId, answer.valueJson]));

	for (const question of questions) {
		drafts[question.id] = storedAnswerToDraftValue(question, answerByQuestionID.get(question.id));
	}

	return drafts;
}

/**
 * storedAnswerToDraftValue parses one stored JSON answer into the matching form value.
 */
function storedAnswerToDraftValue(question: StandupQuestion, valueJSON: string | undefined): AnswerDraftValue {
	if (valueJSON === undefined || valueJSON.trim() === '') {
		return '';
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(valueJSON);
	} catch {
		parsed = valueJSON;
	}

	switch (question.type) {
		case 'checkbox':
		case 'boolean':
			return parsed === true;

		case 'multi_select':
			return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];

		case 'number':
		case 'duration':
			return parsed === null || parsed === undefined ? '' : String(parsed);

		case 'text':
		case 'long_text':
		case 'dropdown':
		default:
			return typeof parsed === 'string' ? parsed : String(parsed ?? '');
	}
}

/**
 * scheduleAllowsDate returns true when a schedule can be selected for the
 * current runtime decision.
 */
function scheduleAllowsDate(
	schedule: StandupSchedule,
	schedules: readonly StandupSchedule[],
	runtimeDecision: StandupRunDecision | null,
): boolean {
	if (!schedule.enabled || runtimeDecision?.shouldRun !== true) {
		return false;
	}

	if (schedule.kind === 'weekly') {
		return runtimeDecision.isLastWorkingDayOfWeek;
	}

	if (schedule.kind === 'daily') {
		return !(schedule.skipDailyWhenWeeklyRuns && runtimeDecision.isLastWorkingDayOfWeek && hasWeeklySchedule(schedules));
	}

	return true;
}

/**
 * hasWeeklySchedule reports whether a workspace has an enabled weekly schedule.
 */
function hasWeeklySchedule(schedules: readonly StandupSchedule[]): boolean {
	return schedules.some(schedule => schedule.enabled && schedule.kind === 'weekly' && schedule.weeklyMode === 'last_working_day');
}

/**
 * blockedDateMessage returns a user-facing reason the current date cannot be submitted.
 */
function blockedDateMessage(
	occurrenceDate: string,
	today: string,
	runtimeDecision: StandupRunDecision | null,
	availableSchedules: readonly StandupSchedule[],
): string {
	if (occurrenceDate.trim() === '') {
		return 'Choose a standup date.';
	}

	if (occurrenceDate > today) {
		return 'Future standups cannot be submitted.';
	}

	if (runtimeDecision !== null && !runtimeDecision.shouldRun) {
		return runtimeDecision.message || 'Standup does not run on this date.';
	}

	if (runtimeDecision?.shouldRun === true && availableSchedules.length === 0) {
		return 'No enabled standup schedule runs on this workspace date.';
	}

	return '';
}

/**
 * todayForWorkspace returns today's YYYY-MM-DD date for the workspace timezone.
 */
function todayForWorkspace(timezone: string): string {
	const cleanTimezone = timezone.trim();
	if (cleanTimezone === '') {
		return getTodayLocalDateString();
	}

	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: cleanTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(new Date());

		const year = parts.find(part => part.type === 'year')?.value ?? '';
		const month = parts.find(part => part.type === 'month')?.value ?? '';
		const day = parts.find(part => part.type === 'day')?.value ?? '';

		if (year !== '' && month !== '' && day !== '') {
			return `${year}-${month}-${day}`;
		}
	} catch {
		return getTodayLocalDateString();
	}

	return getTodayLocalDateString();
}

/**
 * formatSubmittedAt returns a compact updated-at label for submit success.
 */
function formatSubmittedAt(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return 'just now';
	}

	return new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}
