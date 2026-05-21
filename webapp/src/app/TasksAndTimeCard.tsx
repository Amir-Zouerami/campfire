import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { CheckCircle2, Clock3, ExternalLink, Loader2, Plus, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, createTask, createTimeEntry, listMyTasks, listMyTimeEntries, updateTask } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TimeEntry, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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
	const [taskProjectID, setTaskProjectID] = useState('');
	const [taskCategoryID, setTaskCategoryID] = useState('');
	const [taskBoardUrl, setTaskBoardUrl] = useState('');

	const [timeTaskID, setTimeTaskID] = useState('');
	const [timeEntryDate, setTimeEntryDate] = useState(getTodayLocalDateString());
	const [timeMinutes, setTimeMinutes] = useState('30');
	const [timeNote, setTimeNote] = useState('');
	const [timeProjectID, setTimeProjectID] = useState('');
	const [timeCategoryID, setTimeCategoryID] = useState('');

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
					setTimeProjectID(firstTask.projectId);
					setTimeCategoryID(firstTask.categoryId);
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

	const activeTaskCount = useMemo(() => {
		return tasks.filter(task => task.status === 'active' || task.status === 'blocked').length;
	}, [tasks]);

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
				projectId: taskProjectID.trim(),
				categoryId: taskCategoryID.trim(),
				boardUrl: taskBoardUrl.trim(),
			});

			setTasks(current => [response.task, ...current]);
			setTaskTitle('');
			setTaskDescription('');
			setTaskProjectID('');
			setTaskCategoryID('');
			setTaskBoardUrl('');
			setTimeTaskID(response.task.id);
			setTimeProjectID(response.task.projectId);
			setTimeCategoryID(response.task.categoryId);
			setLoadState('ready');
			setMessage('Task created.');
			toast.success('Task created');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
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
				projectId: task.projectId,
				categoryId: task.categoryId,
				status,
				boardUrl: task.boardUrl,
			});

			setTasks(current => replaceTask(current, response.task));
			setLoadState('ready');
			setMessage('Task updated.');
			toast.success('Task updated');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates the selected task and copies its project/category defaults.
	 */
	function handleTimeTaskChange(taskID: string): void {
		setTimeTaskID(taskID);

		const selectedTask = tasks.find(task => task.id === taskID);
		if (selectedTask === undefined) {
			setTimeProjectID('');
			setTimeCategoryID('');
			return;
		}

		setTimeProjectID(selectedTask.projectId);
		setTimeCategoryID(selectedTask.categoryId);
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

		if (timeEntryDate.trim() === '') {
			setMessage('Choose a time entry date.');
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
				projectId: timeProjectID.trim(),
				categoryId: timeCategoryID.trim(),
			});

			setTimeEntries(current => [response.timeEntry, ...current]);
			setTimeMinutes('30');
			setTimeNote('');
			setLoadState('ready');
			setMessage('Time entry added.');
			toast.success('Time entry added');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Tasks & time"
				title="My tasks and time"
				description="Track tasks and add time to any task for any date. Project and category keys feed the time reports."
				icon={TimerReset}
				action={
					<CampfireStatusPill tone="green">
						<Clock3 className="cf:size-3.5" />
						{formatMinutes(totalMinutes)} logged
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric label="Active tasks" value={String(activeTaskCount)} helper="Active or blocked" />
					<CampfireMetric label="Recent entries" value={String(timeEntries.length)} helper="Last 14 days" />
					<CampfireMetric label="Total time" value={formatMinutes(totalMinutes)} helper="Visible window" />
				</div>

				{message !== '' && <StatusMessage state={loadState} message={message} />}

				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<CreateTaskForm
						isBusy={isBusy}
						taskTitle={taskTitle}
						taskDescription={taskDescription}
						taskProjectID={taskProjectID}
						taskCategoryID={taskCategoryID}
						taskBoardUrl={taskBoardUrl}
						onTaskTitleChange={setTaskTitle}
						onTaskDescriptionChange={setTaskDescription}
						onTaskProjectIDChange={setTaskProjectID}
						onTaskCategoryIDChange={setTaskCategoryID}
						onTaskBoardUrlChange={setTaskBoardUrl}
						onSubmit={handleCreateTask}
					/>

					<CreateTimeEntryForm
						isBusy={isBusy}
						sortedTasks={sortedTasks}
						timeTaskID={timeTaskID}
						timeEntryDate={timeEntryDate}
						timeMinutes={timeMinutes}
						timeNote={timeNote}
						timeProjectID={timeProjectID}
						timeCategoryID={timeCategoryID}
						onTimeTaskIDChange={handleTimeTaskChange}
						onTimeEntryDateChange={setTimeEntryDate}
						onTimeMinutesChange={setTimeMinutes}
						onTimeNoteChange={setTimeNote}
						onTimeProjectIDChange={setTimeProjectID}
						onTimeCategoryIDChange={setTimeCategoryID}
						onSubmit={handleCreateTimeEntry}
					/>
				</div>

				<Separator className="cf:bg-white/10" />

				<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
					<div>
						<h3 className="cf:text-xl cf:font-black cf:tracking-tight cf:text-white">My tasks</h3>
						<p className="cf:mt-1 cf:text-sm cf:font-medium cf:text-slate-400">
							Keep the list focused, or include archived work for lookup.
						</p>
					</div>

					<label className="cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:px-4 cf:py-3 cf:text-sm cf:font-bold cf:text-slate-200">
						<Checkbox
							checked={includeArchived}
							onCheckedChange={checked => setIncludeArchived(checked === true)}
						/>
						Include archived
					</label>
				</div>

				<div className="cf:grid cf:gap-3">
					{loadState === 'loading' && <LoadingRow label="Loading tasks and time…" />}

					{loadState !== 'loading' && sortedTasks.length === 0 && (
						<CampfireEmpty
							icon={Plus}
							title="No tasks yet"
							description="Create your first task, then log time against it for any date."
						/>
					)}

					{sortedTasks.map(task => (
						<TaskCard
							key={task.id}
							task={task}
							isBusy={isBusy}
							onStatusChange={status => void handleStatusChange(task, status)}
						/>
					))}
				</div>

				<Separator className="cf:bg-white/10" />

				<div>
					<div className="cf:flex cf:flex-wrap cf:items-end cf:justify-between cf:gap-3">
						<div>
							<h3 className="cf:text-xl cf:font-black cf:tracking-tight cf:text-white">Recent time</h3>
							<p className="cf:mt-1 cf:text-sm cf:font-medium cf:text-slate-400">
								Recent entries from the visible two-week window.
							</p>
						</div>
						<Badge variant="secondary" className="cf:rounded-full">
							{recentTimeEntries.length} entries
						</Badge>
					</div>

					<div className="cf:mt-4 cf:grid cf:gap-3">
						{recentTimeEntries.length === 0 && (
							<CampfireEmpty
								icon={Clock3}
								title="No recent time"
								description="Log time against a task to make reports useful."
							/>
						)}

						{recentTimeEntries.map(entry => (
							<TimeEntryRow entry={entry} tasksByID={tasksByID} key={entry.id} />
						))}
					</div>
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * CreateTaskFormProps describes the task creation form.
 */
type CreateTaskFormProps = {
	readonly isBusy: boolean;
	readonly taskTitle: string;
	readonly taskDescription: string;
	readonly taskProjectID: string;
	readonly taskCategoryID: string;
	readonly taskBoardUrl: string;
	readonly onTaskTitleChange: (value: string) => void;
	readonly onTaskDescriptionChange: (value: string) => void;
	readonly onTaskProjectIDChange: (value: string) => void;
	readonly onTaskCategoryIDChange: (value: string) => void;
	readonly onTaskBoardUrlChange: (value: string) => void;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * CreateTaskForm renders the task creation form.
 */
function CreateTaskForm(props: CreateTaskFormProps): ReactElement {
	return (
		<form
			className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
			onSubmit={event => void props.onSubmit(event)}
		>
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Create task</h3>
				<CampfireStatusPill tone="ember">New</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-4">
				<FormField label="Task title" htmlFor="campfire-task-title">
					<Input
						id="campfire-task-title"
						disabled={props.isBusy}
						placeholder="Task title"
						value={props.taskTitle}
						onChange={event => props.onTaskTitleChange(event.currentTarget.value)}
					/>
				</FormField>

				<FormField label="Description" htmlFor="campfire-task-description">
					<Textarea
						id="campfire-task-description"
						disabled={props.isBusy}
						placeholder="What needs to happen?"
						value={props.taskDescription}
						onChange={event => props.onTaskDescriptionChange(event.currentTarget.value)}
					/>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:sm:grid-cols-2">
					<FormField label="Project key" htmlFor="campfire-task-project">
						<Input
							id="campfire-task-project"
							disabled={props.isBusy}
							placeholder="frontend"
							value={props.taskProjectID}
							onChange={event => props.onTaskProjectIDChange(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Category key" htmlFor="campfire-task-category">
						<Input
							id="campfire-task-category"
							disabled={props.isBusy}
							placeholder="bugfix"
							value={props.taskCategoryID}
							onChange={event => props.onTaskCategoryIDChange(event.currentTarget.value)}
						/>
					</FormField>
				</div>

				<FormField label="Board URL" htmlFor="campfire-task-board-url">
					<Input
						id="campfire-task-board-url"
						disabled={props.isBusy}
						placeholder="https://..."
						type="url"
						value={props.taskBoardUrl}
						onChange={event => props.onTaskBoardUrlChange(event.currentTarget.value)}
					/>
				</FormField>

				<Button disabled={props.isBusy} type="submit">
					<Plus className="cf:size-4" />
					Create task
				</Button>
			</div>
		</form>
	);
}

/**
 * CreateTimeEntryFormProps describes the time entry form.
 */
type CreateTimeEntryFormProps = {
	readonly isBusy: boolean;
	readonly sortedTasks: readonly Task[];
	readonly timeTaskID: string;
	readonly timeEntryDate: string;
	readonly timeMinutes: string;
	readonly timeNote: string;
	readonly timeProjectID: string;
	readonly timeCategoryID: string;
	readonly onTimeTaskIDChange: (value: string) => void;
	readonly onTimeEntryDateChange: (value: string) => void;
	readonly onTimeMinutesChange: (value: string) => void;
	readonly onTimeNoteChange: (value: string) => void;
	readonly onTimeProjectIDChange: (value: string) => void;
	readonly onTimeCategoryIDChange: (value: string) => void;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * CreateTimeEntryForm renders the time entry form.
 */
function CreateTimeEntryForm(props: CreateTimeEntryFormProps): ReactElement {
	return (
		<form
			className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
			onSubmit={event => void props.onSubmit(event)}
		>
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Log time</h3>
				<CampfireStatusPill tone="green">Any date</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-4">
				<FormField label="Task" htmlFor="campfire-time-task">
					<select
						id="campfire-time-task"
						className={selectClassName()}
						disabled={props.isBusy || props.sortedTasks.length === 0}
						value={props.timeTaskID}
						onChange={event => props.onTimeTaskIDChange(event.currentTarget.value)}
					>
						<option value="">Choose task</option>
						{props.sortedTasks.map(task => (
							<option key={task.id} value={task.id}>
								{task.title}
							</option>
						))}
					</select>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:sm:grid-cols-2">
					<FormField label="Date" htmlFor="campfire-time-date">
						<Input
							id="campfire-time-date"
							disabled={props.isBusy}
							type="date"
							value={props.timeEntryDate}
							onChange={event => props.onTimeEntryDateChange(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Minutes" htmlFor="campfire-time-minutes">
						<Input
							id="campfire-time-minutes"
							disabled={props.isBusy}
							min={1}
							max={1440}
							placeholder="30"
							type="number"
							value={props.timeMinutes}
							onChange={event => props.onTimeMinutesChange(event.currentTarget.value)}
						/>
					</FormField>
				</div>

				<div className="cf:grid cf:gap-4 cf:sm:grid-cols-2">
					<FormField label="Project override" htmlFor="campfire-time-project">
						<Input
							id="campfire-time-project"
							disabled={props.isBusy}
							placeholder="optional"
							value={props.timeProjectID}
							onChange={event => props.onTimeProjectIDChange(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Category override" htmlFor="campfire-time-category">
						<Input
							id="campfire-time-category"
							disabled={props.isBusy}
							placeholder="optional"
							value={props.timeCategoryID}
							onChange={event => props.onTimeCategoryIDChange(event.currentTarget.value)}
						/>
					</FormField>
				</div>

				<FormField label="Note" htmlFor="campfire-time-note">
					<Input
						id="campfire-time-note"
						disabled={props.isBusy}
						placeholder="Short note"
						value={props.timeNote}
						onChange={event => props.onTimeNoteChange(event.currentTarget.value)}
					/>
				</FormField>

				<Button disabled={props.isBusy || props.sortedTasks.length === 0} type="submit">
					<TimerReset className="cf:size-4" />
					Add time
				</Button>
			</div>
		</form>
	);
}

/**
 * TaskCard renders one task row.
 */
function TaskCard(props: {
	readonly task: Task;
	readonly isBusy: boolean;
	readonly onStatusChange: (status: TaskStatus) => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_190px] cf:lg:items-start">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-base cf:font-black cf:text-white">{props.task.title}</strong>
						<TaskStatusBadge status={props.task.status} />
					</div>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<TaskMetaChip label="Project" value={props.task.projectId} />
						<TaskMetaChip label="Category" value={props.task.categoryId} />
					</div>

					{props.task.description !== '' && (
						<p className="cf:mt-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
							{props.task.description}
						</p>
					)}

					{props.task.boardUrl !== '' && (
						<a
							className="cf:mt-3 cf:inline-flex cf:items-center cf:gap-2 cf:text-sm cf:font-black cf:text-amber-200 cf:hover:text-amber-100"
							href={props.task.boardUrl}
							rel="noreferrer"
							target="_blank"
						>
							Open board item
							<ExternalLink className="cf:size-4" />
						</a>
					)}
				</div>

				<FormField label="Status" htmlFor={`campfire-task-status-${props.task.id}`}>
					<select
						id={`campfire-task-status-${props.task.id}`}
						className={selectClassName()}
						disabled={props.isBusy}
						value={props.task.status}
						onChange={event => props.onStatusChange(event.currentTarget.value as TaskStatus)}
					>
						{taskStatusOptions.map(status => (
							<option key={status} value={status}>
								{formatStatus(status)}
							</option>
						))}
					</select>
				</FormField>
			</div>
		</article>
	);
}

/**
 * TimeEntryRow renders one recent time entry.
 */
function TimeEntryRow(props: {
	readonly entry: TimeEntry;
	readonly tasksByID: Readonly<Record<string, Task>>;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<strong className="cf:block cf:text-base cf:font-black cf:text-white">
						{props.entry.entryDate} · {formatMinutes(props.entry.minutes)}
					</strong>
					<p className="cf:mt-1 cf:text-sm cf:font-medium cf:text-slate-400" title={props.entry.taskId}>
						{taskLabelForID(props.tasksByID, props.entry.taskId)}
					</p>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<TaskMetaChip label="Project" value={props.entry.projectId} />
						<TaskMetaChip label="Category" value={props.entry.categoryId} />
					</div>

					{props.entry.note !== '' && (
						<p className="cf:mt-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
							{props.entry.note}
						</p>
					)}
				</div>

				<CampfireStatusPill tone="green">
					<Clock3 className="cf:size-3.5" />
					{formatMinutes(props.entry.minutes)}
				</CampfireStatusPill>
			</div>
		</article>
	);
}

/**
 * FormField renders a labeled field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}

/**
 * TaskMetaChip renders optional task/time metadata.
 */
function TaskMetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * TaskStatusBadge renders task status with a visual tone.
 */
function TaskStatusBadge(props: { readonly status: TaskStatus }): ReactElement {
	const className = cn(
		'cf:rounded-full cf:border cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest',
		statusClassName(props.status),
	);

	return <span className={className}>{formatStatus(props.status)}</span>;
}

/**
 * StatusMessage renders save/load feedback.
 */
function StatusMessage(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
}

/**
 * statusClassName returns tone classes for task statuses.
 */
function statusClassName(status: TaskStatus): string {
	switch (status) {
		case 'active':
			return 'cf:border-emerald-300/25 cf:bg-emerald-400/10 cf:text-emerald-100';
		case 'blocked':
			return 'cf:border-red-300/25 cf:bg-red-400/10 cf:text-red-100';
		case 'completed':
			return 'cf:border-sky-300/25 cf:bg-sky-400/10 cf:text-sky-100';
		case 'dropped':
			return 'cf:border-slate-300/20 cf:bg-slate-400/10 cf:text-slate-200';
		case 'archived':
			return 'cf:border-white/10 cf:bg-white/5 cf:text-slate-300';
	}
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
