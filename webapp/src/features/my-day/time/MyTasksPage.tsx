import { useDeferredValue, useMemo, useState, type ReactElement } from 'react';
import { Inbox, Plus } from 'lucide-react';

import { CampfireDataTable, CampfireDataTableCell, CampfireDataTableRow } from '@/components/campfire/CampfireDataTable';
import {
	CampfireBackButton,
	CampfireEmptyState,
	CampfireFieldError,
	CampfireStatusPill,
	CampfireSurface,
} from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireInlineCheckbox } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSearchInput } from '@/components/campfire/CampfireSearchInput';
import { Button } from '@/components/ui/button';
import { CampfireBidiText, CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import type { Task, TaskStatus, Workspace } from '@/types/domain';

import { formatTaskStatus, statusTone, taskStatusOptions } from './my-time.helpers';
import { MyTimeFeedback, MyTimeLoading } from './MyTimeFeedback';
import { useMyTimeLog } from './useMyTimeLog';

/**
 * MyTasksPageProps contains workspace context and back navigation.
 */
type MyTasksPageProps = {
	readonly workspace: Workspace;
	readonly onBack?: () => void;
};

/**
 * TaskStatusFilter identifies the local task status filter.
 */
type TaskStatusFilter = TaskStatus | 'all';

/**
 * MyTasksPage renders a focused task management page using the existing task API shape.
 */
export function MyTasksPage(props: MyTasksPageProps): ReactElement {
	const timeLog = useMyTimeLog({ workspace: props.workspace });
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
	const [createOpen, setCreateOpen] = useState(false);
	const deferredQuery = useDeferredValue(query);

	const visibleTasks = useMemo(() => {
		return filterTasks(timeLog.tasks, deferredQuery, statusFilter);
	}, [timeLog.tasks, deferredQuery, statusFilter]);

	return (
		<div className="campfire-page-stack">
			{props.onBack !== undefined && (
				<CampfireBackButton onClick={props.onBack}>Back to My Day</CampfireBackButton>
			)}

			<CampfirePageIntro
				eyebrow="My tasks"
				title="Review active work"
				description="Search, create, and update your Campfire tasks."
				actions={
					<Button type="button" onClick={() => setCreateOpen(current => !current)}>
						<Plus className="cf:size-4" />
						New task
					</Button>
				}
			/>

			<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />
			{timeLog.loadState === 'loading' && <MyTimeLoading />}

			{createOpen && (
				<CampfireSurface>
					<div className="campfire-surface-header campfire-surface-header--with-action">
						<div>
							<h3 className="campfire-surface-title">Create task</h3>
							<p className="campfire-surface-description">Add one clear work item to track from My Day.</p>
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
							Close
						</Button>
					</div>

					<div className="campfire-form-grid campfire-form-grid--task">
						<label className="campfire-form-field">
							<span>Title</span>
							<CampfireResponsiveInput
								value={timeLog.taskDraft.title}
								disabled={timeLog.isBusy}
								placeholder="Add a concrete task title"
								aria-invalid={timeLog.taskDraftErrors.title !== undefined}
								aria-describedby={timeLog.taskDraftErrors.title !== undefined ? 'campfire-task-title-error' : undefined}
								onValueChange={value => timeLog.updateTaskDraft({ title: value })}
							/>
							<CampfireFieldError id="campfire-task-title-error" message={timeLog.taskDraftErrors.title} />
						</label>

						<label className="campfire-form-field campfire-form-field--wide">
							<span>Description</span>
							<CampfireResponsiveTextarea
								value={timeLog.taskDraft.description}
								disabled={timeLog.isBusy}
								placeholder="Optional context for this task"
								onValueChange={value => timeLog.updateTaskDraft({ description: value })}
							/>
						</label>

						<label className="campfire-form-field">
							<span>Board URL</span>
							<CampfireResponsiveInput
								value={timeLog.taskDraft.boardUrl}
								disabled={timeLog.isBusy}
								placeholder="https://…"
								onValueChange={value => timeLog.updateTaskDraft({ boardUrl: value })}
							/>
						</label>
					</div>

					<div className="campfire-form-actions">
						<Button type="button" disabled={timeLog.isBusy} onClick={() => void timeLog.submitTask()}>
							Create task
						</Button>
					</div>
				</CampfireSurface>
			)}

			<CampfireSurface className="campfire-table-surface campfire-readable-table-surface">
				<div className="campfire-list-toolbar">
					<CampfireSearchInput value={query} placeholder="Search tasks…" onValueChange={setQuery} />

					<CampfireSelect
						id="campfire-my-task-status-filter"
						value={statusFilter}
						onValueChange={value => setStatusFilter(value as TaskStatusFilter)}
					>
						<option value="all">All statuses</option>
						{taskStatusOptions.map(status => (
							<option key={status} value={status}>
								{formatTaskStatus(status)}
							</option>
						))}
					</CampfireSelect>

					<CampfireInlineCheckbox
						checked={timeLog.includeArchived}
						disabled={timeLog.isBusy}
						label="Include archived"
						onCheckedChange={timeLog.setIncludeArchived}
					/>
				</div>

				<CampfireDataTable
					label="My tasks"
					columns={['Task', 'Status', 'Source', 'Updated', 'Change status']}
					empty={visibleTasks.length === 0 ? (
						<CampfireEmptyState
							icon={Inbox}
							title="No tasks match this view"
							description="Clear the filters or create a task to start tracking work."
						/>
					) : undefined}
					footer={<>Showing {visibleTasks.length} of {timeLog.tasks.length} tasks</>}
				>
					{visibleTasks.map(task => (
						<TaskRow
							key={task.id}
							task={task}
							disabled={timeLog.isBusy}
							onStatusChange={status => {
								void timeLog.changeTaskStatus(task.id, status);
							}}
						/>
					))}
				</CampfireDataTable>
			</CampfireSurface>
		</div>
	);
}

/**
 * TaskRow renders one task row with status mutation controls.
 */
function TaskRow(props: {
	readonly task: Task;
	readonly disabled: boolean;
	readonly onStatusChange: (status: TaskStatus) => void;
}): ReactElement {
	return (
		<CampfireDataTableRow>
			<CampfireDataTableCell className="campfire-task-title-cell campfire-task-title-cell--compact">
				<strong>
					<CampfireEllipsisText value={props.task.title} />
				</strong>
				{props.task.boardUrl.trim() !== '' && (
					<a href={props.task.boardUrl} target="_blank" rel="noreferrer">
						Open board
					</a>
				)}
			</CampfireDataTableCell>

			<CampfireDataTableCell>
				<CampfireStatusPill tone={statusTone(props.task.status)}>
					<CampfireBidiText title={formatTaskStatus(props.task.status)}>{formatTaskStatus(props.task.status)}</CampfireBidiText>
				</CampfireStatusPill>
			</CampfireDataTableCell>

			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={props.task.sourceSubmissionId.trim() === '' ? 'Manual' : 'Standup'} />
			</CampfireDataTableCell>

			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={formatDateTime(props.task.updatedAt)} />
			</CampfireDataTableCell>

			<CampfireDataTableCell>
				<CampfireSelect
					id={`campfire-task-status-${props.task.id}`}
					value={props.task.status}
					disabled={props.disabled}
					onValueChange={value => props.onStatusChange(value as TaskStatus)}
				>
					{taskStatusOptions.map(status => (
						<option key={status} value={status}>
							{formatTaskStatus(status)}
						</option>
					))}
				</CampfireSelect>
			</CampfireDataTableCell>
		</CampfireDataTableRow>
	);
}

/**
 * filterTasks applies client-side filters supported by the current task API.
 */
function filterTasks(tasks: readonly Task[], query: string, statusFilter: TaskStatusFilter): readonly Task[] {
	const cleanQuery = query.trim().toLowerCase();

	return tasks.filter(task => {
		if (statusFilter !== 'all' && task.status !== statusFilter) {
			return false;
		}

		if (cleanQuery === '') {
			return true;
		}

		return `${task.title} ${task.description} ${task.boardUrl}`.toLowerCase().includes(cleanQuery);
	});
}

/**
 * formatDateTime returns a readable updated timestamp.
 */
function formatDateTime(value: string): string {
	if (value.trim() === '') {
		return '—';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}
