import type { ReactElement } from 'react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';

import type { Task, TaskStatus } from '@/types/domain';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';

import { formatTaskStatus, statusTone, taskStatusOptions } from './my-time.helpers';

/**
 * MyTaskListPanelProps contains task list state and actions.
 */
type MyTaskListPanelProps = {
	readonly tasks: readonly Task[];
	readonly includeArchived: boolean;
	readonly disabled: boolean;
	readonly onIncludeArchivedChange: (includeArchived: boolean) => void;
	readonly onStatusChange: (taskId: string, status: TaskStatus) => void;
};

/**
 * MyTaskListPanel renders the user's personal tasks.
 */
export function MyTaskListPanel(props: MyTaskListPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						My tasks
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Keep active work visible
					</h3>
				</div>

				<CampfireCheckboxField
					checked={props.includeArchived}
					label="Include archived"
					disabled={props.disabled}
					className="cf:px-4 cf:py-3"
					onCheckedChange={props.onIncludeArchivedChange}
				/>
			</div>

			{props.tasks.length === 0 ? (
				<CampfireEmpty
					title="No tasks yet"
					description="Create a task first, then log time against it for any date."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.tasks.map(task => (
						<TaskRow
							key={task.id}
							task={task}
							disabled={props.disabled}
							onStatusChange={status => props.onStatusChange(task.id, status)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * TaskRow renders one task row.
 */
function TaskRow(props: {
	readonly task: Task;
	readonly disabled: boolean;
	readonly onStatusChange: (status: TaskStatus) => void;
}): ReactElement {
	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_13rem]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-black cf:text-foreground">
						{props.task.title}
					</h4>
					<CampfireStatusPill tone={statusTone(props.task.status)}>
						{formatTaskStatus(props.task.status)}
					</CampfireStatusPill>
				</div>

				{props.task.description.trim() !== '' && (
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{props.task.description}
					</p>
				)}

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<TaskMetaChip label="Project" value={props.task.projectId} />
					<TaskMetaChip label="Category" value={props.task.categoryId} />
					<TaskMetaChip label="Board" value={props.task.boardUrl} />
				</div>
			</div>

			<CampfireField id={`campfire-my-task-status-${props.task.id}`} label="Status">
				<CampfireSelect
					id={`campfire-my-task-status-${props.task.id}`}
					disabled={props.disabled}
					value={props.task.status}
					onValueChange={value => props.onStatusChange(value as TaskStatus)}
				>
					{taskStatusOptions.map(status => (
						<option key={status} value={status}>
							{formatTaskStatus(status)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>
		</article>
	);
}

/**
 * TaskMetaChip renders optional task metadata.
 */
function TaskMetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}
