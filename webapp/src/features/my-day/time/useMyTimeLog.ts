import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { createTask, createTimeEntry, deleteTimeEntry, listMyTasks, listMyTimeEntries, updateTask } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { campfireQueryKeys } from '@/query';
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
	readonly text: UseMyTimeLogText;
};

/**
 * UseMyTimeLogText contains localized copy used by the hook.
 */
type UseMyTimeLogText = {
	readonly taskCreated: string;
	readonly timeLogged: string;
	readonly taskTitleRequired: string;
	readonly chooseTask: string;
	readonly minutesPositive: string;
	readonly fallbackError: string;
	readonly taskRemoved: string;
	readonly timeEntryDeleted: string;
};

/**
 * MyTimeSnapshot is the query-owned read model for personal tasks and time.
 */
type MyTimeSnapshot = {
	readonly tasks: readonly Task[];
	readonly timeEntries: readonly TimeEntry[];
};

/**
 * UseMyTimeLogResult contains all state/actions needed by the tasks and time pages.
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
	readonly removeTask: (taskId: string) => Promise<void>;
	readonly deleteTimeEntry: (timeEntryId: string) => Promise<void>;
};

/**
 * useMyTimeLog owns form state while TanStack Query owns server state.
 *
 * This keeps task/time reads cacheable and invalidatable, while mutations remain
 * isolated behind typed handlers. The hook deliberately avoids duplicating query
 * data into local state so every task and time page sees one consistent source
 * of truth after create/update operations.
 */
export function useMyTimeLog(input: UseMyTimeLogInput): UseMyTimeLogResult {
	const queryClient = useQueryClient();
	const dateRange = useMemo(() => defaultRecentTimeEntryRange(), []);
	const [includeArchived, setIncludeArchivedState] = useState(false);
	const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
	const [taskDraftErrors, setTaskDraftErrors] = useState<TaskDraftValidationErrors>({});
	const [timeDraft, setTimeDraft] = useState<TimeEntryDraft>(emptyTimeEntryDraft);
	const [timeDraftErrors, setTimeDraftErrors] = useState<TimeEntryDraftValidationErrors>({});
	const [message, setMessage] = useState('');

	const snapshotQuery = useQuery({
		queryKey: campfireQueryKeys.myTimeSnapshot(
			input.workspace.id,
			includeArchived,
			dateRange.startDate,
			dateRange.endDate,
		),
		queryFn: () => fetchTasksAndTime(input.workspace.id, includeArchived, dateRange.startDate, dateRange.endDate),
		staleTime: 30_000,
	});

	const tasks = snapshotQuery.data?.tasks ?? [];
	const timeEntries = snapshotQuery.data?.timeEntries ?? [];

	const loggableTasks = useMemo(() => {
		return tasks.filter(taskCanReceiveTime);
	}, [tasks]);

	const tasksByID = useMemo(() => {
		return taskMapByID(tasks);
	}, [tasks]);

	const totalRecentMinutes = useMemo(() => {
		return timeEntries.reduce((total, entry) => total + entry.minutes, 0);
	}, [timeEntries]);

	useEffect(() => {
		setTimeDraft(current => ensureSelectedTask(current, tasks));
	}, [tasks]);

	const createTaskMutation = useMutation({
		mutationFn: (request: Parameters<typeof createTask>[1]) => createTask(input.workspace.id, request),
		onSuccess: async response => {
			setTaskDraft(emptyTaskDraft());
			setTimeDraft(current => ({
				...current,
				taskId: response.task.id,
				projectId: response.task.projectId,
				categoryId: response.task.categoryId,
			}));
			setMessage('');
			toast.success(input.text.taskCreated);
			await invalidatePersonalTimeQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const createTimeEntryMutation = useMutation({
		mutationFn: (request: Parameters<typeof createTimeEntry>[1]) => createTimeEntry(input.workspace.id, request),
		onSuccess: async () => {
			setTimeDraft(current => ({
				...current,
				minutes: '30',
				note: '',
			}));
			setMessage('');
			toast.success(input.text.timeLogged);
			await invalidatePersonalTimeQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const updateTaskMutation = useMutation({
		mutationFn: (request: { readonly task: Task; readonly status: TaskStatus }) => updateTask(
			input.workspace.id,
			request.task.id,
			{
				title: request.task.title,
				description: request.task.description,
				projectId: request.task.projectId,
				categoryId: request.task.categoryId,
				status: request.status,
				boardUrl: request.task.boardUrl,
			},
		),
		onSuccess: async () => {
			setMessage('');
			await invalidatePersonalTimeQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const deleteTimeEntryMutation = useMutation({
		mutationFn: (timeEntryId: string) => deleteTimeEntry(input.workspace.id, timeEntryId),
		onSuccess: async () => {
			setMessage('');
			toast.success(input.text.timeEntryDeleted);
			await invalidatePersonalTimeQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const mutationPending = createTaskMutation.isPending || createTimeEntryMutation.isPending || updateTaskMutation.isPending || deleteTimeEntryMutation.isPending;
	const loadState = resolveLoadState(snapshotQuery.isPending, snapshotQuery.isError, mutationPending);
	const isBusy = loadState === 'loading' || loadState === 'saving';
	const displayedMessage = snapshotQuery.isError ? errorToMessage(snapshotQuery.error, input.text.fallbackError) : message;

	/**
	 * handleIncludeArchivedChange lets the query key drive refresh behavior.
	 */
	function handleIncludeArchivedChange(nextIncludeArchived: boolean): void {
		if (nextIncludeArchived === includeArchived || isBusy) {
			return;
		}

		setIncludeArchivedState(nextIncludeArchived);
		setMessage('');
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
			setTaskDraftErrors({ title: input.text.taskTitleRequired });
			return;
		}

		setTaskDraftErrors({});
		setMessage('');

		try {
			await createTaskMutation.mutateAsync({
				title,
				description: taskDraft.description.trim(),
				projectId: taskDraft.projectId.trim(),
				categoryId: taskDraft.categoryId.trim(),
				boardUrl: taskDraft.boardUrl.trim(),
			});
		} catch {
			// The mutation owns user-facing error handling through onError.
		}
	}

	/**
	 * submitTimeEntry logs time against the selected task.
	 */
	async function submitTimeEntry(): Promise<void> {
		const nextErrors: { taskId?: string; minutes?: string } = {};

		if (timeDraft.taskId.trim() === '') {
			nextErrors.taskId = input.text.chooseTask;
		}

		const minutes = parseMinutes(timeDraft.minutes);
		if (minutes === null) {
			nextErrors.minutes = input.text.minutesPositive;
		}

		if (nextErrors.taskId !== undefined || nextErrors.minutes !== undefined || minutes === null) {
			setTimeDraftErrors(nextErrors);
			return;
		}

		setTimeDraftErrors({});
		setMessage('');

		try {
			await createTimeEntryMutation.mutateAsync({
				taskId: timeDraft.taskId,
				entryDate: timeDraft.entryDate,
				minutes,
				note: timeDraft.note.trim(),
				projectId: timeDraft.projectId.trim(),
				categoryId: timeDraft.categoryId.trim(),
			});
		} catch {
			// The mutation owns user-facing error handling through onError.
		}
	}

	/**
	 * changeTaskStatus updates one task status.
	 */
	async function changeTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
		const task = tasks.find(candidate => candidate.id === taskId);

		if (task === undefined || task.status === status) {
			return;
		}

		setMessage('');

		try {
			await updateTaskMutation.mutateAsync({ task, status });
		} catch {
			// The mutation owns user-facing error handling through onError.
		}
	}

	/**
	 * removeTask archives one personal task so it disappears from the default task list without deleting history.
	 */
	async function removeTask(taskId: string): Promise<void> {
		const task = tasks.find(candidate => candidate.id === taskId);

		if (task === undefined || task.status === 'archived') {
			return;
		}

		setMessage('');

		try {
			await updateTaskMutation.mutateAsync({ task, status: 'archived' });
			toast.success(input.text.taskRemoved);
		} catch {
			// The mutation owns user-facing error handling through onError.
		}
	}

	/**
	 * deleteTimeEntryByID removes one mistaken time entry.
	 */
	async function deleteTimeEntryByID(timeEntryId: string): Promise<void> {
		if (timeEntryId.trim() === '') {
			return;
		}

		setMessage('');

		try {
			await deleteTimeEntryMutation.mutateAsync(timeEntryId);
		} catch {
			// The mutation owns user-facing error handling through onError.
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
		message: displayedMessage,
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
		removeTask,
		deleteTimeEntry: deleteTimeEntryByID,
	};
}

/**
 * fetchTasksAndTime loads the current user's tasks and recent time entries.
 */
async function fetchTasksAndTime(
	workspaceId: string,
	includeArchived: boolean,
	startDate: string,
	endDate: string,
): Promise<MyTimeSnapshot> {
	const [taskResponse, timeResponse] = await Promise.all([
		listMyTasks(workspaceId, includeArchived),
		listMyTimeEntries(workspaceId, startDate, endDate),
	]);

	return {
		tasks: taskResponse.tasks,
		timeEntries: timeResponse.timeEntries,
	};
}

/**
 * defaultRecentTimeEntryRange returns the local recent-window used by My Day.
 */
function defaultRecentTimeEntryRange(): { readonly startDate: string; readonly endDate: string } {
	const endDate = getTodayLocalDateString();

	return {
		startDate: addDaysToLocalDate(endDate, -14),
		endDate,
	};
}

/**
 * resolveLoadState maps query/mutation state into the existing page contract.
 */
function resolveLoadState(isLoading: boolean, isError: boolean, isSaving: boolean): MyTimeLoadState {
	if (isSaving) {
		return 'saving';
	}

	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	return 'ready';
}

/**
 * invalidatePersonalTimeQueries refreshes all current-user task/time cache entries.
 */
async function invalidatePersonalTimeQueries(queryClient: QueryClient, workspaceID: string): Promise<void> {
	await queryClient.invalidateQueries({
		queryKey: campfireQueryKeys.myDay(workspaceID),
	});
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
