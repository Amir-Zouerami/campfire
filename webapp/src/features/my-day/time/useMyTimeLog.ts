import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { createTask, createTimeEntry, listMyTasks, listMyTimeEntries, updateTask } from '@/api';
import type { Task, TaskStatus, TimeEntry, Workspace } from '@/types/domain';

import {
	activeTaskCount,
	addDaysToLocalDate,
	emptyTaskDraft,
	emptyTimeEntryDraft,
	errorToMessage,
	getTodayLocalDateString,
	parseMinutes,
	taskCanReceiveTime,
	taskMapByID,
} from './my-time.helpers';
import type {
	MyTimeLoadState,
	TaskDraft,
	TaskDraftPatch,
	TaskDraftValidationErrors,
	TimeEntryDraft,
	TimeEntryDraftPatch,
	TimeEntryDraftValidationErrors,
} from './my-time.types';

/**
 * UseMyTimeLogInput contains workspace context for the hook.
 */
type UseMyTimeLogInput = {
	readonly workspace: Workspace;
};

/**
 * UseMyTimeLogResult contains all tasks/time page state and actions.
 */
export type UseMyTimeLogResult = {
	readonly loadState: MyTimeLoadState;
	readonly tasks: readonly Task[];
	readonly timeEntries: readonly TimeEntry[];
	readonly loggableTasks: readonly Task[];
	readonly tasksByID: Readonly<Record<string, Task>>;
	readonly includeArchived: boolean;
	readonly taskDraft: TaskDraft;
	readonly taskDraftErrors: TaskDraftValidationErrors;
	readonly timeDraft: TimeEntryDraft;
	readonly timeDraftErrors: TimeEntryDraftValidationErrors;
	readonly message: string;
	readonly isBusy: boolean;
	readonly activeTaskCount: number;
	readonly totalRecentMinutes: number;
	readonly setIncludeArchived: (includeArchived: boolean) => void;
	readonly updateTaskDraft: (patch: TaskDraftPatch) => void;
	readonly updateTimeDraft: (patch: TimeEntryDraftPatch) => void;
	readonly handleTimeTaskChange: (taskId: string) => void;
	readonly submitTask: () => Promise<void>;
	readonly submitTimeEntry: () => Promise<void>;
	readonly changeTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
};

/**
 * useMyTimeLog owns loading, form state, and mutations for My Day time logging.
 */
export function useMyTimeLog(input: UseMyTimeLogInput): UseMyTimeLogResult {
	const [loadState, setLoadState] = useState<MyTimeLoadState>('idle');
	const [tasks, setTasks] = useState<readonly Task[]>([]);
	const [timeEntries, setTimeEntries] = useState<readonly TimeEntry[]>([]);
	const [includeArchived, setIncludeArchivedState] = useState(false);
	const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
	const [taskDraftErrors, setTaskDraftErrors] = useState<TaskDraftValidationErrors>({});
	const [timeDraft, setTimeDraft] = useState<TimeEntryDraft>(emptyTimeEntryDraft);
	const [timeDraftErrors, setTimeDraftErrors] = useState<TimeEntryDraftValidationErrors>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadInitialData loads current-user task and time data.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const snapshot = await fetchTasksAndTime(input.workspace.id, false);

				if (!isActive) {
					return;
				}

				setIncludeArchivedState(false);
				setTasks(snapshot.tasks);
				setTimeEntries(snapshot.timeEntries);
				setTimeDraft(current => ensureSelectedTask(current, snapshot.tasks));
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

	const loggableTasks = useMemo(() => {
		return tasks.filter(taskCanReceiveTime);
	}, [tasks]);

	const tasksByID = useMemo(() => {
		return taskMapByID(tasks);
	}, [tasks]);

	const totalRecentMinutes = useMemo(() => {
		return timeEntries.reduce((total, entry) => total + entry.minutes, 0);
	}, [timeEntries]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * handleIncludeArchivedChange refreshes tasks in-place without unmounting the page.
	 */
	function handleIncludeArchivedChange(nextIncludeArchived: boolean): void {
		if (nextIncludeArchived === includeArchived || loadState === 'loading' || loadState === 'saving') {
			return;
		}

		setIncludeArchivedState(nextIncludeArchived);
		setLoadState('saving');
		setMessage('');

		void refreshTasksForArchivePreference(nextIncludeArchived);
	}

	/**
	 * refreshTasksForArchivePreference reloads the task list without replacing the whole page with loading state.
	 */
	async function refreshTasksForArchivePreference(nextIncludeArchived: boolean): Promise<void> {
		try {
			const response = await listMyTasks(input.workspace.id, nextIncludeArchived);

			setTasks(response.tasks);
			setTimeDraft(current => ensureSelectedTask(current, response.tasks));
			setLoadState('ready');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setIncludeArchivedState(current => !current);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * updateTaskDraft patches the create-task form.
	 */
	function updateTaskDraft(patch: TaskDraftPatch): void {
		setTaskDraft(current => ({
			...current,
			...patch,
		}));

		if (patch.title !== undefined) {
			setTaskDraftErrors(current => ({
				...current,
				title: undefined,
			}));
		}
	}

	/**
	 * updateTimeDraft patches the log-time form.
	 */
	function updateTimeDraft(patch: TimeEntryDraftPatch): void {
		setTimeDraft(current => ({
			...current,
			...patch,
		}));

		setTimeDraftErrors(current => ({
			...current,
			taskId: patch.taskId !== undefined ? undefined : current.taskId,
			minutes: patch.minutes !== undefined ? undefined : current.minutes,
		}));
	}

	/**
	 * handleTimeTaskChange selects a task and copies its project/category defaults.
	 */
	function handleTimeTaskChange(taskId: string): void {
		const task = tasks.find(candidate => candidate.id === taskId);

		setTimeDraft(current => ({
			...current,
			taskId,
			projectId: task?.projectId ?? current.projectId,
			categoryId: task?.categoryId ?? current.categoryId,
		}));
		setTimeDraftErrors(current => ({
			...current,
			taskId: undefined,
		}));
	}

	/**
	 * submitTask creates a new personal task.
	 */
	async function submitTask(): Promise<void> {
		const title = taskDraft.title.trim();

		if (title === '') {
			setTaskDraftErrors({ title: 'Task title is required.' });
			return;
		}

		setTaskDraftErrors({});
		setLoadState('saving');
		setMessage('');

		try {
			const response = await createTask(input.workspace.id, {
				title,
				description: taskDraft.description.trim(),
				projectId: taskDraft.projectId.trim(),
				categoryId: taskDraft.categoryId.trim(),
				boardUrl: taskDraft.boardUrl.trim(),
			});

			setTasks(current => [response.task, ...current]);
			setTaskDraft(emptyTaskDraft());
			setTimeDraft(current => ({
				...current,
				taskId: response.task.id,
				projectId: response.task.projectId,
				categoryId: response.task.categoryId,
			}));
			setLoadState('ready');
			setMessage('');
			toast.success('Task created');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * submitTimeEntry logs time against the selected task.
	 */
	async function submitTimeEntry(): Promise<void> {
		const nextErrors: {
			taskId?: string;
			minutes?: string;
		} = {};

		if (timeDraft.taskId.trim() === '') {
			nextErrors.taskId = 'Choose a task before logging time.';
		}

		const minutes = parseMinutes(timeDraft.minutes);
		if (minutes === null) {
			nextErrors.minutes = 'Minutes must be greater than zero.';
		}

		if (nextErrors.taskId !== undefined || nextErrors.minutes !== undefined || minutes === null) {
			setTimeDraftErrors(nextErrors);
			return;
		}

		setTimeDraftErrors({});
		setLoadState('saving');
		setMessage('');

		try {
			const response = await createTimeEntry(input.workspace.id, {
				taskId: timeDraft.taskId,
				entryDate: timeDraft.entryDate,
				minutes,
				note: timeDraft.note.trim(),
				projectId: timeDraft.projectId.trim(),
				categoryId: timeDraft.categoryId.trim(),
			});

			setTimeEntries(current => [response.timeEntry, ...current]);
			setTimeDraft(current => ({
				...current,
				minutes: '30',
				note: '',
			}));
			setLoadState('ready');
			setMessage('');
			toast.success('Time logged');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * changeTaskStatus updates one task status.
	 */
	async function changeTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
		const task = tasks.find(candidate => candidate.id === taskId);

		if (task === undefined) {
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateTask(input.workspace.id, task.id, {
				title: task.title,
				description: task.description,
				projectId: task.projectId,
				categoryId: task.categoryId,
				status,
				boardUrl: task.boardUrl,
			});

			setTasks(current =>
				current.map(candidate => (candidate.id === response.task.id ? response.task : candidate)),
			);
			setLoadState('ready');
			setMessage('');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		tasks,
		timeEntries,
		loggableTasks,
		tasksByID,
		includeArchived,
		taskDraft,
		taskDraftErrors,
		timeDraft,
		timeDraftErrors,
		message,
		isBusy,
		activeTaskCount: activeTaskCount(tasks),
		totalRecentMinutes,
		setIncludeArchived: handleIncludeArchivedChange,
		updateTaskDraft,
		updateTimeDraft,
		handleTimeTaskChange,
		submitTask,
		submitTimeEntry,
		changeTaskStatus,
	};
}

/**
 * fetchTasksAndTime loads the current user's tasks and recent time entries.
 */
async function fetchTasksAndTime(
	workspaceId: string,
	includeArchived: boolean,
): Promise<{ readonly tasks: readonly Task[]; readonly timeEntries: readonly TimeEntry[] }> {
	const today = getTodayLocalDateString();
	const startDate = addDaysToLocalDate(today, -14);

	const [taskResponse, timeResponse] = await Promise.all([
		listMyTasks(workspaceId, includeArchived),
		listMyTimeEntries(workspaceId, startDate, today),
	]);

	return {
		tasks: taskResponse.tasks,
		timeEntries: timeResponse.timeEntries,
	};
}

/**
 * ensureSelectedTask fills the log-time task picker when tasks exist.
 */
function ensureSelectedTask(current: TimeEntryDraft, tasks: readonly Task[]): TimeEntryDraft {
	if (current.taskId !== '') {
		return current;
	}

	const firstTask = tasks.find(taskCanReceiveTime);

	if (firstTask === undefined) {
		return current;
	}

	return {
		...current,
		taskId: firstTask.id,
		projectId: firstTask.projectId,
		categoryId: firstTask.categoryId,
	};
}
