import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createTask, listMyTasks, listStandupConfiguration, submitStandup } from '@/api';
import type { StandupQuestion, StandupSchedule, StandupTemplate, Task, Workspace } from '@/types/domain';

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
	readonly selectedSchedule: StandupSchedule | null;
	readonly selectedTemplate: StandupTemplate | null;
	readonly visibleQuestions: readonly StandupQuestion[];
	readonly selectedScheduleID: string;
	readonly occurrenceDate: string;
	readonly answers: AnswerDrafts;
	readonly message: string;
	readonly isBusy: boolean;
	readonly setOccurrenceDate: (date: string) => void;
	readonly handleScheduleChange: (scheduleID: string) => void;
	readonly updateAnswer: (questionID: string, value: AnswerDraftValue) => void;
	readonly submitCurrentStandup: () => Promise<void>;
};

/**
 * normalizeTaskTitleKey returns a stable comparison key for task titles.
 */
function normalizeTaskTitleKey(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * formatUpdatedAtLabel returns a readable last-updated timestamp.
 */
function formatUpdatedAtLabel(value: string): string {
	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return 'just now';
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(parsed);
}

/**
 * useMyStandup owns loading, draft state, validation, and submission for My Day check-in.
 */
export function useMyStandup(input: UseMyStandupInput): UseMyStandupResult {
	const [loadState, setLoadState] = useState<MyStandupLoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [tasks, setTasks] = useState<readonly Task[]>([]);
	const [selectedScheduleID, setSelectedScheduleID] = useState('');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [answers, setAnswers] = useState<AnswerDrafts>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadInitialData loads the standup form and current-user task context.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [configurationResponse, tasksResponse] = await Promise.all([
					listStandupConfiguration(input.workspace.id),
					// Load archived tasks too so standup item sync does not recreate old tasks with the same title.
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
	}, [input.workspace.id]);

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
	 * syncStandupTasks creates any missing tasks from itemized standup answers.
	 */
	async function syncStandupTasks(): Promise<number> {
		const titles = taskTitlesFromStandupAnswers(visibleQuestions, answers);

		if (titles.length === 0) {
			return 0;
		}

		const existingKeys = new Set(tasks.map(task => normalizeTaskTitleKey(task.title)));
		const createdTasks: Task[] = [];

		for (const title of titles) {
			const normalizedTitle = normalizeTaskTitleKey(title);

			if (normalizedTitle === '' || existingKeys.has(normalizedTitle)) {
				continue;
			}

			const response = await createTask(input.workspace.id, {
				title,
				description: `Auto-created from standup on ${occurrenceDate}.`,
				projectId: '',
				categoryId: '',
				boardUrl: '',
			});

			createdTasks.push(response.task);
			existingKeys.add(normalizedTitle);
		}

		if (createdTasks.length > 0) {
			setTasks(current => [...createdTasks, ...current]);
		}

		return createdTasks.length;
	}

	/**
	 * submitCurrentStandup validates and submits the current answer draft.
	 */
	async function submitCurrentStandup(): Promise<void> {
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

			let createdTaskCount = 0;
			let taskSyncFailed = false;

			try {
				createdTaskCount = await syncStandupTasks();
			} catch (_error: unknown) {
				taskSyncFailed = true;
			}

			const updatedAt = formatUpdatedAtLabel(response.submission.lastUpdatedAt);

			let successMessage = `Standup submitted. Last updated ${updatedAt}.`;

			if (createdTaskCount > 0) {
				successMessage += ` ${createdTaskCount} task${createdTaskCount === 1 ? '' : 's'} added to Time Log.`;
			}

			if (taskSyncFailed) {
				successMessage += ' Standup was saved, but task sync failed.';
			}

			setLoadState('ready');
			setMessage(successMessage);

			if (taskSyncFailed) {
				toast.warning('Standup submitted, but tasks could not be synced');
			} else if (createdTaskCount > 0) {
				toast.success(`Standup submitted · ${createdTaskCount} tasks synced`);
			} else {
				toast.success('Standup submitted');
			}

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
		tasks,
		activeTasks,
		selectedSchedule,
		selectedTemplate,
		visibleQuestions,
		selectedScheduleID,
		occurrenceDate,
		answers,
		message,
		isBusy,
		setOccurrenceDate,
		handleScheduleChange,
		updateAnswer,
		submitCurrentStandup,
	};
}
