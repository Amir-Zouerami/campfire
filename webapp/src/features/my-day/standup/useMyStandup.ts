import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { listMyTasks, listStandupConfiguration, submitStandup } from '@/api';
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
					listMyTasks(input.workspace.id, false),
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

			const updatedLabel = formatStandupSubmissionTime(response.submission.lastUpdatedAt);

			setLoadState('ready');
			setMessage(`Standup saved. Last updated ${updatedLabel}.`);
			toast.success('Standup saved');
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

/**
 * formatStandupSubmissionTime formats a submission timestamp for compact feedback.
 */
function formatStandupSubmissionTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}
