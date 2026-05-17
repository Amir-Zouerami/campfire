import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { ApiClientError, createTask, createTimeEntry, listMyTasks, listMyTimeEntries, updateTask } from '../api/client';
import type { Task, TaskStatus, TimeEntry, Workspace } from '../types/domain';

/**
 * TasksAndTimeCardProps contains workspace data for task and time tracking.
 */
type TasksAndTimeCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes the task/time card state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

const taskStatusOptions: readonly TaskStatus[] = ['active', 'blocked', 'completed', 'dropped', 'archived'];

/**
 * TasksAndTimeCard lets users create tasks and log time against any task/date.
 */
export function TasksAndTimeCard(props: TasksAndTimeCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [tasks, setTasks] = useState<readonly Task[]>([]);
	const [timeEntries, setTimeEntries] = useState<readonly TimeEntry[]>([]);
	const [includeArchived, setIncludeArchived] = useState(false);
	const [taskTitle, setTaskTitle] = useState('');
	const [taskDescription, setTaskDescription] = useState('');
	const [taskBoardUrl, setTaskBoardUrl] = useState('');
	const [timeTaskID, setTimeTaskID] = useState('');
	const [timeEntryDate, setTimeEntryDate] = useState(getTodayLocalDateString());
	const [timeMinutes, setTimeMinutes] = useState('30');
	const [timeNote, setTimeNote] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads current-user tasks and recent time entries.
		 */
		async function loadTasksAndTime(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const today = getTodayLocalDateString();
				const startDate = addDaysToLocalDate(today, -14);

				const [taskResponse, timeResponse] = await Promise.all([
					listMyTasks(props.workspace.id, includeArchived),
					listMyTimeEntries(props.workspace.id, startDate, today),
				]);

				if (!isActive) {
					return;
				}

				setTasks(taskResponse.tasks);
				setTimeEntries(timeResponse.timeEntries);

				const firstTask = taskResponse.tasks[0];
				if (timeTaskID === '' && firstTask !== undefined) {
					setTimeTaskID(firstTask.id);
				}

				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadTasksAndTime();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, includeArchived]);

	const sortedTasks = useMemo(() => {
		return [...tasks].sort((first, second) => first.title.localeCompare(second.title));
	}, [tasks]);

	const recentTimeEntries = useMemo(() => {
		return [...timeEntries].sort((first, second) => {
			if (first.entryDate === second.entryDate) {
				return second.createdAt.localeCompare(first.createdAt);
			}

			return second.entryDate.localeCompare(first.entryDate);
		});
	}, [timeEntries]);

	const totalMinutes = useMemo(() => {
		return timeEntries.reduce((total, entry) => total + entry.minutes, 0);
	}, [timeEntries]);

	const tasksByID = useMemo(() => indexTasksByID(tasks), [tasks]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Creates a task from the task form.
	 */
	async function handleCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const cleanTitle = taskTitle.trim();
		if (cleanTitle === '') {
			setMessage('Task title is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createTask(props.workspace.id, {
				title: cleanTitle,
				description: taskDescription.trim(),
				boardUrl: taskBoardUrl.trim(),
			});

			setTasks(current => [response.task, ...current]);
			setTaskTitle('');
			setTaskDescription('');
			setTaskBoardUrl('');
			setTimeTaskID(response.task.id);
			setLoadState('ready');
			setMessage('Task created.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Updates a task status.
	 */
	async function handleStatusChange(task: Task, status: TaskStatus): Promise<void> {
		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateTask(props.workspace.id, task.id, {
				title: task.title,
				description: task.description,
				status,
				boardUrl: task.boardUrl,
			});

			setTasks(current => replaceTask(current, response.task));
			setLoadState('ready');
			setMessage('Task updated.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Creates a time entry from the time form.
	 */
	async function handleCreateTimeEntry(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const minutes = Number.parseInt(timeMinutes, 10);
		if (timeTaskID.trim() === '') {
			setMessage('Choose a task before logging time.');
			return;
		}

		if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
			setMessage('Minutes must be between 1 and 1440.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createTimeEntry(props.workspace.id, {
				taskId: timeTaskID,
				entryDate: timeEntryDate,
				minutes,
				note: timeNote.trim(),
			});

			setTimeEntries(current => [response.timeEntry, ...current]);
			setTimeMinutes('30');
			setTimeNote('');
			setLoadState('ready');
			setMessage('Time entry added.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-lime-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-lime-200">
						Tasks & time
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						My tasks and time
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Track tasks and add time to any task for any date. Recent time entries show the last 14 days.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-lime-300/25 cf:bg-lime-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-lime-200">
					{formatMinutes(totalMinutes)} logged
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<form
					className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
					onSubmit={event => void handleCreateTask(event)}
				>
					<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Create task</h3>

					<div className="cf:mt-4 cf:grid cf:gap-3">
						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-lime-300/45"
							disabled={isBusy}
							placeholder="Task title"
							type="text"
							value={taskTitle}
							onChange={event => setTaskTitle(event.currentTarget.value)}
						/>

						<textarea
							className="cf:min-h-24 cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-lime-300/45"
							disabled={isBusy}
							placeholder="Description"
							value={taskDescription}
							onChange={event => setTaskDescription(event.currentTarget.value)}
						/>

						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-lime-300/45"
							disabled={isBusy}
							placeholder="Board URL"
							type="url"
							value={taskBoardUrl}
							onChange={event => setTaskBoardUrl(event.currentTarget.value)}
						/>

						<button
							className="cf:rounded-2xl cf:border cf:border-lime-300/30 cf:bg-lime-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-lime-50 cf:transition cf:hover:bg-lime-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
							disabled={isBusy}
							type="submit"
						>
							Create task
						</button>
					</div>
				</form>

				<form
					className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
					onSubmit={event => void handleCreateTimeEntry(event)}
				>
					<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Log time</h3>

					<div className="cf:mt-4 cf:grid cf:gap-3">
						<select
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-lime-300/45"
							disabled={isBusy || sortedTasks.length === 0}
							value={timeTaskID}
							onChange={event => setTimeTaskID(event.currentTarget.value)}
						>
							<option value="">Choose task</option>
							{sortedTasks.map(task => (
								<option key={task.id} value={task.id}>
									{task.title}
								</option>
							))}
						</select>

						<div className="cf:grid cf:gap-3 cf:sm:grid-cols-2">
							<input
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-lime-300/45"
								disabled={isBusy}
								type="date"
								value={timeEntryDate}
								onChange={event => setTimeEntryDate(event.currentTarget.value)}
							/>

							<input
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-lime-300/45"
								disabled={isBusy}
								min={1}
								max={1440}
								placeholder="Minutes"
								type="number"
								value={timeMinutes}
								onChange={event => setTimeMinutes(event.currentTarget.value)}
							/>
						</div>

						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-lime-300/45"
							disabled={isBusy}
							placeholder="Note"
							type="text"
							value={timeNote}
							onChange={event => setTimeNote(event.currentTarget.value)}
						/>

						<button
							className="cf:rounded-2xl cf:border cf:border-lime-300/30 cf:bg-lime-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-lime-50 cf:transition cf:hover:bg-lime-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
							disabled={isBusy || sortedTasks.length === 0}
							type="submit"
						>
							Add time
						</button>
					</div>
				</form>
			</div>

			<div className="cf:mt-5 cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">My tasks</h3>
				<label className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-bold cf:text-slate-300">
					<input
						checked={includeArchived}
						className="cf:h-4 cf:w-4"
						type="checkbox"
						onChange={event => setIncludeArchived(event.currentTarget.checked)}
					/>
					Include archived
				</label>
			</div>

			<div className="cf:mt-3 cf:grid cf:gap-3">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading tasks and time…</p>}

				{loadState !== 'loading' && sortedTasks.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No tasks yet.
					</p>
				)}

				{sortedTasks.map(task => (
					<article
						className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={task.id}
					>
						<div className="cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_180px] cf:lg:items-start">
							<div>
								<strong className="cf:block cf:text-base cf:font-black cf:text-white">
									{task.title}
								</strong>
								{task.description !== '' && (
									<p className="cf:m-0 cf:mt-2 cf:text-sm cf:leading-6 cf:text-slate-300">
										{task.description}
									</p>
								)}
								{task.boardUrl !== '' && (
									<a
										className="cf:mt-2 cf:inline-block cf:text-sm cf:font-bold cf:text-lime-200 cf:hover:text-lime-100"
										href={task.boardUrl}
										rel="noreferrer"
										target="_blank"
									>
										Open board item
									</a>
								)}
							</div>

							<select
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-sm cf:font-bold cf:text-white cf:outline-none"
								disabled={isBusy}
								value={task.status}
								onChange={event =>
									void handleStatusChange(task, event.currentTarget.value as TaskStatus)
								}
							>
								{taskStatusOptions.map(status => (
									<option key={status} value={status}>
										{formatStatus(status)}
									</option>
								))}
							</select>
						</div>
					</article>
				))}
			</div>

			<div className="cf:mt-5">
				<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Recent time</h3>
				<div className="cf:mt-3 cf:grid cf:gap-3">
					{recentTimeEntries.length === 0 ? (
						<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
							No recent time entries.
						</p>
					) : null}

					{recentTimeEntries.map(entry => (
						<article
							className="cf:flex cf:flex-col cf:gap-2 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:sm:flex-row cf:sm:items-center cf:sm:justify-between"
							key={entry.id}
						>
							<div>
								<strong className="cf:block cf:text-sm cf:font-black cf:text-white">
									{entry.entryDate} · {formatMinutes(entry.minutes)}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-xs cf:text-slate-400" title={entry.taskId}>
									Task {taskLabelForID(tasksByID, entry.taskId)}
								</p>
								{entry.note !== '' && (
									<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">{entry.note}</p>
								)}
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

/**
 * indexTasksByID returns tasks keyed by task ID.
 */
function indexTasksByID(tasks: readonly Task[]): Readonly<Record<string, Task>> {
	const result: Record<string, Task> = {};

	for (const task of tasks) {
		result[task.id] = task;
	}

	return result;
}

/**
 * taskLabelForID returns the best available task label.
 */
function taskLabelForID(tasksByID: Readonly<Record<string, Task>>, taskID: string): string {
	const task = tasksByID[taskID];

	if (task === undefined) {
		return taskID;
	}

	if (task.title.trim() === '') {
		return task.id;
	}

	return task.title;
}

/**
 * replaceTask replaces one task in a readonly list.
 */
function replaceTask(tasks: readonly Task[], updatedTask: Task): readonly Task[] {
	return tasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
}

/**
 * formatStatus returns a human-readable task status.
 */
function formatStatus(status: TaskStatus): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * formatMinutes formats minutes as compact hours/minutes text.
 */
function formatMinutes(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (hours === 0) {
		return `${remainingMinutes}m`;
	}

	if (remainingMinutes === 0) {
		return `${hours}h`;
	}

	return `${hours}h ${remainingMinutes}m`;
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	return dateToLocalDateString(new Date());
}

/**
 * addDaysToLocalDate adds days to a YYYY-MM-DD local date string.
 */
function addDaysToLocalDate(localDate: string, days: number): string {
	const parts = localDate.split('-');

	if (parts.length !== 3) {
		return getTodayLocalDateString();
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return getTodayLocalDateString();
	}

	return dateToLocalDateString(new Date(year, month - 1, day + days));
}

/**
 * dateToLocalDateString formats a Date as local YYYY-MM-DD.
 */
function dateToLocalDateString(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update tasks or time.';
}
