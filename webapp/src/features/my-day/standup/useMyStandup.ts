import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createTask, evaluateStandupDay, listMyTasks, listStandupConfiguration, submitStandup } from '@/api';
import type {
	StandupQuestion,
	StandupRunDecision,
	StandupSchedule,
	StandupTemplate,
	Task,
	Workspace,
} from '@/types/domain';

import {
	activeTasksForStandup,
	buildInitialAnswers,
	enabledOrFirstSchedule,
	errorToMessage,
	findTemplateForSchedule,
	getTodayLocalDateString,
	normalizeAnswerValue,
	questionsForTemplate,
	validateRequiredAnswers,
} from './my-standup.helpers';
import { taskTitlesFromStandupAnswers } from './standup-task-list.helpers';
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
	readonly tasks: readonly Task[];
	readonly activeTasks: readonly Task[];
	readonly runtimeDecision: StandupRunDecision | null;
	readonly canSubmitToday: boolean;
	readonly selectedSchedule: StandupSchedule | null;
	readonly selectedTemplate: StandupTemplate | null;
	readonly visibleQuestions: readonly StandupQuestion[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly answers: AnswerDrafts;
	readonly message: string;
	readonly isBusy: boolean;
	readonly handleScheduleChange: (scheduleID: string) => void;
	readonly updateAnswer: (questionID: string, value: AnswerDraftValue) => void;
	readonly submitCurrentStandup: () => Promise<void>;
};

/**
 * useMyStandup owns loading, draft state, validation, runtime checks, and submission for My Day check-in.
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
	const [answers, setAnswers] = useState<AnswerDrafts>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadInitialData loads the standup form, today's runtime decision, and current-user tasks.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');
			setRuntimeDecision(null);

			try {
				const [configurationResponse, tasksResponse, runtimeResponse] = await Promise.all([
					listStandupConfiguration(input.workspace.id),
					listMyTasks(input.workspace.id, false),
					evaluateStandupDay(input.workspace.id, today),
				]);

				if (!isActive) {
					return;
				}

				const firstSchedule = enabledOrFirstSchedule(configurationResponse.schedules);

				setTemplates(configurationResponse.templates);
				setQuestions(configurationResponse.questions);
				setSchedules(configurationResponse.schedules);
				setTasks(tasksResponse.tasks);
				setRuntimeDecision(runtimeResponse.decision);
				setSelectedScheduleID(firstSchedule?.id ?? '');
				setAnswers(
					firstSchedule === null
						? {}
						: buildInitialAnswers(configurationResponse.questions, firstSchedule.templateId),
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
	}, [input.workspace.id, today]);

	const selectedSchedule = useMemo(() => {
		return schedules.find(schedule => schedule.id === selectedScheduleID) ?? null;
	}, [schedules, selectedScheduleID]);

	const selectedTemplate = useMemo(() => {
		return findTemplateForSchedule(templates, selectedSchedule);
	}, [templates, selectedSchedule]);

	const visibleQuestions = useMemo(() => {
		return questionsForTemplate(questions, selectedTemplate);
	}, [questions, selectedTemplate]);

	const activeTasks = useMemo(() => {
		return activeTasksForStandup(tasks);
	}, [tasks]);

	const isBusy = loadState === 'loading' || loadState === 'saving';
	const canSubmitToday = runtimeDecision?.shouldRun === true;

	/**
	 * handleScheduleChange changes selected schedule and rebuilds answer drafts.
	 */
	function handleScheduleChange(scheduleID: string): void {
		const nextSchedule = schedules.find(schedule => schedule.id === scheduleID) ?? null;

		setSelectedScheduleID(scheduleID);
		setAnswers(nextSchedule === null ? {} : buildInitialAnswers(questions, nextSchedule.templateId));
	}

	/**
	 * updateAnswer updates one answer draft.
	 */
	function updateAnswer(questionID: string, value: AnswerDraftValue): void {
		setAnswers(current => ({
			...current,
			[questionID]: value,
		}));
	}

	/**
	 * submitCurrentStandup validates and submits the current answer draft.
	 */
	async function submitCurrentStandup(): Promise<void> {
		if (!canSubmitToday) {
			const runtimeMessage = runtimeDecision?.message ?? 'Standup cannot be submitted today.';
			setMessage(runtimeMessage);
			setLoadState('error');
			toast.error(runtimeMessage);
			return;
		}

		if (selectedSchedule === null || selectedTemplate === null) {
			setMessage('Choose a standup schedule before submitting.');
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
			await submitStandup({
				workspaceId: input.workspace.id,
				templateId: selectedTemplate.id,
				scheduleId: selectedSchedule.id,
				occurrenceDate: today,
				answers: visibleQuestions.map(question => ({
					questionId: question.id,
					valueJson: JSON.stringify(normalizeAnswerValue(question, answers[question.id])),
				})),
			});

			const createdTaskCount = await syncStandupTasks();
			const successMessage = createdTaskCount > 0
				? `Standup submitted. ${createdTaskCount} ${createdTaskCount === 1 ? 'task' : 'tasks'} added to Time Log.`
				: 'Standup submitted.';

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

	/**
	 * syncStandupTasks creates missing active tasks from itemized standup answers.
	 */
	async function syncStandupTasks(): Promise<number> {
		const titles = taskTitlesFromStandupAnswers(visibleQuestions, answers);
		if (titles.length === 0) {
			return 0;
		}

		const existingTitleKeys = new Set(tasks.map(task => normalizeTaskTitleKey(task.title)));
		const createdTasks: Task[] = [];

		for (const title of titles) {
			const cleanTitle = title.trim();
			const key = normalizeTaskTitleKey(cleanTitle);

			if (key === '' || existingTitleKeys.has(key)) {
				continue;
			}

			const response = await createTask(input.workspace.id, {
				title: cleanTitle,
				description: '',
				projectId: '',
				categoryId: '',
				boardUrl: '',
			});

			createdTasks.push(response.task);
			existingTitleKeys.add(key);
		}

		if (createdTasks.length > 0) {
			setTasks(current => [...createdTasks, ...current]);
		}

		return createdTasks.length;
	}

	return {
		loadState,
		templates,
		questions,
		schedules,
		tasks,
		activeTasks,
		runtimeDecision,
		canSubmitToday,
		selectedSchedule,
		selectedTemplate,
		visibleQuestions,
		selectedScheduleID,
		occurrenceDate: today,
		answers,
		message,
		isBusy,
		handleScheduleChange,
		updateAnswer,
		submitCurrentStandup,
	};
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
 * normalizeTaskTitleKey creates a stable comparison key for task titles.
 */
function normalizeTaskTitleKey(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
