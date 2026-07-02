import { useDeferredValue, useMemo, useState, type ReactElement } from 'react';
import { Inbox, Plus, Trash2 } from 'lucide-react';

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
import { isolateBidiText, useI18n } from '@/i18n';
import type { Task, TaskStatus, Workspace } from '@/types/domain';

import { statusTone, taskStatusOptions } from './my-time.helpers';
import { formatLocalizedDateTime, taskStatusTranslationKey } from './my-time.i18n';
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
	const { htmlLang, t } = useI18n();
	const timeLog = useMyTimeLog({
		workspace: props.workspace,
		text: {
			taskCreated: t('myDay.time.toast.taskCreated'),
			timeLogged: t('myDay.time.toast.timeLogged'),
			taskTitleRequired: t('myDay.time.validation.taskTitleRequired'),
			chooseTask: t('myDay.time.validation.chooseTask'),
			minutesPositive: t('myDay.time.validation.minutesPositive'),
			fallbackError: t('myDay.time.error.fallback'),
			taskRemoved: t('myDay.tasks.toast.removed'),
			timeEntryDeleted: t('myDay.time.toast.entryDeleted'),
		},
	});
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
				<CampfireBackButton onClick={props.onBack}>{t('common.backToMyDay')}</CampfireBackButton>
			)}

			<CampfirePageIntro
				eyebrow={t('myDay.tasks.page.eyebrow')}
				title={t('myDay.tasks.page.title')}
				description={t('myDay.tasks.page.description')}
				actions={
					<Button type="button" disabled={timeLog.isBusy} onClick={() => setCreateOpen(current => !current)}>
						<Plus className="cf:size-4" />
						{t('myDay.tasks.action.newTask')}
					</Button>
				}
			/>

			<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />
			{timeLog.loadState === 'loading' && <MyTimeLoading />}

			{timeLog.loadState !== 'loading' && createOpen && (
				<CampfireSurface>
					<div className="campfire-surface-header campfire-surface-header--with-action">
						<div>
							<h3 className="campfire-surface-title">{t('myDay.tasks.create.title')}</h3>
							<p className="campfire-surface-description">{t('myDay.tasks.create.description')}</p>
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
							{t('common.close')}
						</Button>
					</div>

					<div className="campfire-form-grid campfire-form-grid--task">
						<label className="campfire-form-field">
							<span>{t('myDay.tasks.field.title')}</span>
							<CampfireResponsiveInput
								value={timeLog.taskDraft.title}
								disabled={timeLog.isBusy}
								placeholder={t('myDay.tasks.field.title.placeholder')}
								aria-invalid={timeLog.taskDraftErrors.title !== undefined}
								aria-describedby={timeLog.taskDraftErrors.title !== undefined ? 'campfire-task-title-error' : undefined}
								onValueChange={value => timeLog.updateTaskDraft({ title: value })}
							/>
							<CampfireFieldError id="campfire-task-title-error" message={timeLog.taskDraftErrors.title} />
						</label>

						<label className="campfire-form-field campfire-form-field--wide">
							<span>{t('myDay.tasks.field.description')}</span>
							<CampfireResponsiveTextarea
								value={timeLog.taskDraft.description}
								disabled={timeLog.isBusy}
								placeholder={t('myDay.tasks.field.description.placeholder')}
								onValueChange={value => timeLog.updateTaskDraft({ description: value })}
							/>
						</label>

						<label className="campfire-form-field">
							<span>{t('myDay.tasks.field.boardUrl')}</span>
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
							{t('myDay.tasks.create.submit')}
						</Button>
					</div>
				</CampfireSurface>
			)}

			{timeLog.loadState !== 'loading' && (
				<CampfireSurface className="campfire-table-surface campfire-readable-table-surface">
					<div className="campfire-list-toolbar">
						<CampfireSearchInput value={query} placeholder={t('myDay.tasks.search.placeholder')} onValueChange={setQuery} />

						<CampfireSelect
							id="campfire-my-task-status-filter"
							value={statusFilter}
							onValueChange={value => setStatusFilter(value as TaskStatusFilter)}
						>
							<option value="all">{t('myDay.tasks.filter.allStatuses')}</option>
							{taskStatusOptions.map(status => (
								<option key={status} value={status}>
									{t(taskStatusTranslationKey(status))}
								</option>
							))}
						</CampfireSelect>

						<CampfireInlineCheckbox
							checked={timeLog.includeArchived}
							disabled={timeLog.isBusy}
							label={t('myDay.tasks.filter.includeArchived')}
							onCheckedChange={timeLog.setIncludeArchived}
						/>
					</div>

					<CampfireDataTable
						label={t('myDay.tasks.table.label')}
						columns={[
							t('myDay.tasks.table.column.task'),
							t('myDay.tasks.table.column.status'),
							t('myDay.tasks.table.column.source'),
							t('myDay.tasks.table.column.updated'),
							t('myDay.tasks.table.column.changeStatus'),
							t('common.delete'),
						]}
						className="campfire-data-table--personal-tasks"
						columnsTemplate="minmax(0, 1.35fr) minmax(7rem, 0.65fr) minmax(7rem, 0.62fr) minmax(9rem, 0.78fr) minmax(11rem, 0.9fr) minmax(3.2rem, 0.22fr)"
						empty={visibleTasks.length === 0 ? (
							<CampfireEmptyState
								icon={Inbox}
								title={t('myDay.tasks.empty.title')}
								description={t('myDay.tasks.empty.description')}
							/>
						) : undefined}
						footer={<>{t('myDay.tasks.footer.showing', { visible: visibleTasks.length, total: timeLog.tasks.length })}</>}
					>
						{visibleTasks.map(task => (
							<TaskRow
								key={task.id}
								task={task}
								disabled={timeLog.isBusy}
								locale={htmlLang}
								onStatusChange={status => {
									void timeLog.changeTaskStatus(task.id, status);
								}}
								onRemove={() => {
									if (window.confirm(t('myDay.tasks.confirm.removeTask'))) {
										void timeLog.removeTask(task.id);
									}
								}}
							/>
						))}
					</CampfireDataTable>
				</CampfireSurface>
			)}
		</div>
	);
}

/**
 * TaskRow renders one task row with status mutation controls.
 */
function TaskRow(props: {
	readonly task: Task;
	readonly disabled: boolean;
	readonly locale: string;
	readonly onStatusChange: (status: TaskStatus) => void;
	readonly onRemove: () => void;
}): ReactElement {
	const { t } = useI18n();
	const statusLabel = t(taskStatusTranslationKey(props.task.status));
	const sourceLabel = props.task.sourceSubmissionId.trim() === ''
		? t('myDay.tasks.source.manual')
		: t('myDay.tasks.source.standup');

	return (
		<CampfireDataTableRow>
			<CampfireDataTableCell className="campfire-task-title-cell campfire-task-title-cell--compact">
				<strong>
					<CampfireEllipsisText value={props.task.title} />
				</strong>
				{props.task.boardUrl.trim() !== '' && (
					<a href={props.task.boardUrl} target="_blank" rel="noreferrer">
						{t('myDay.tasks.link.openBoard')}
					</a>
				)}
			</CampfireDataTableCell>

			<CampfireDataTableCell>
				<CampfireStatusPill tone={statusTone(props.task.status)}>
					<CampfireBidiText title={statusLabel}>{statusLabel}</CampfireBidiText>
				</CampfireStatusPill>
			</CampfireDataTableCell>

			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={sourceLabel} />
			</CampfireDataTableCell>

			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={isolateBidiText(formatLocalizedDateTime(props.task.updatedAt, props.locale))} />
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
							{t(taskStatusTranslationKey(status))}
						</option>
					))}
				</CampfireSelect>
			</CampfireDataTableCell>

			<CampfireDataTableCell className="campfire-table-action-cell">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={props.disabled || props.task.status === 'archived'}
					aria-label={t('myDay.tasks.action.removeTask')}
					onClick={props.onRemove}
				>
					<Trash2 className="cf:size-4" />
				</Button>
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
