import { Inbox, Plus, Trash2 } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import {
	Anchor,
	Button,
	Checkbox,
	ConfirmDialog,
	Container,
	DataTable,
	EmptyState,
	IconButton,
	Inline,
	PageHeader,
	QueryView,
	SearchInput,
	Select,
	Stack,
	Tag,
	Text,
	toast,
} from '@/shared/ui';
import type { DataColumn } from '@/shared/ui';
import type { Task, TaskStatus } from '@/shared/types/domain';

import { CreateTaskDialog } from './CreateTaskDialog';
import { TASK_STATUSES, taskStatusKey, taskStatusTone, useMyTasks, useTaskMutations } from './tasks';

type StatusFilter = TaskStatus | 'all';

/**
 * filterTasks applies the page's search text and status filter.
 */
function filterTasks(tasks: readonly Task[], query: string, status: StatusFilter): readonly Task[] {
	const needle = query.trim().toLowerCase();

	return tasks.filter(task => {
		if (status !== 'all' && task.status !== status) {
			return false;
		}

		return needle === '' || `${task.title} ${task.description} ${task.boardUrl}`.toLowerCase().includes(needle);
	});
}

/**
 * MyTasksPage lists the signed-in user's tasks and lets them add, search and re-status them.
 */
export function MyTasksPage(): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const [includeArchived, setIncludeArchived] = useState(false);
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState<StatusFilter>('all');
	const [creating, setCreating] = useState(false);
	const [removing, setRemoving] = useState<Task | null>(null);
	const search = useDeferredValue(query);
	const tasks = useMyTasks(includeArchived);
	const { changeStatus } = useTaskMutations();

	const columns: readonly DataColumn<Task>[] = [
		{
			key: 'task',
			header: t('myDay.tasks.table.column.task'),
			render: task => (
				<Stack gap={1}>
					<Text weight="bold" userContent truncate>
						{task.title}
					</Text>
					{task.boardUrl.trim() !== '' && <Anchor href={task.boardUrl}>{t('myDay.tasks.link.openBoard')}</Anchor>}
				</Stack>
			),
		},
		{
			key: 'status',
			header: t('myDay.tasks.table.column.status'),
			render: task => <Tag tone={taskStatusTone(task.status)}>{t(taskStatusKey(task.status))}</Tag>,
		},
		{
			key: 'source',
			header: t('myDay.tasks.table.column.source'),
			render: task => (
				<Text tone="muted">{task.sourceSubmissionId.trim() === '' ? t('myDay.tasks.source.manual') : t('myDay.tasks.source.standup')}</Text>
			),
		},
		{
			key: 'updated',
			header: t('myDay.tasks.table.column.updated'),
			render: task => <Text tone="muted">{formatTimestamp(task.updatedAt)}</Text>,
		},
		{
			key: 'change',
			header: t('myDay.tasks.table.column.changeStatus'),
			width: '11rem',
			render: task => (
				<Select
					label={t('myDay.tasks.table.column.changeStatus')}
					value={task.status}
					disabled={changeStatus.isPending}
					onChange={next => changeStatus.mutate({ task, status: next as TaskStatus })}
					options={TASK_STATUSES.map(option => ({ value: option, label: t(taskStatusKey(option)) }))}
				/>
			),
		},
		{
			key: 'remove',
			header: t('common.delete'),
			align: 'end',
			render: task => (
				<IconButton
					icon={Trash2}
					variant="ghost"
					label={t('myDay.tasks.action.removeTask')}
					disabled={task.status === 'archived'}
					onClick={() => setRemoving(task)}
				/>
			),
		},
	];

	return (
		<Container>
			<PageHeader
				eyebrow={t('myDay.tasks.page.eyebrow')}
				title={t('myDay.tasks.page.title')}
				description={t('myDay.tasks.page.description')}
				actions={
					<Button icon={Plus} onClick={() => setCreating(true)}>
						{t('myDay.tasks.action.newTask')}
					</Button>
				}
			/>

			<Inline gap={3} wrap align="center">
				<Inline grow>
					<SearchInput value={query} onChange={setQuery} placeholder={t('myDay.tasks.search.placeholder')} />
				</Inline>
				<Select
					width="auto"
					label={t('myDay.tasks.filter.allStatuses')}
					value={status}
					onChange={next => setStatus(next as StatusFilter)}
					options={[
						{ value: 'all', label: t('myDay.tasks.filter.allStatuses') },
						...TASK_STATUSES.map(option => ({ value: option, label: t(taskStatusKey(option)) })),
					]}
				/>
				<Checkbox checked={includeArchived} onChange={setIncludeArchived} label={t('myDay.tasks.filter.includeArchived')} />
			</Inline>

			<QueryView query={tasks}>
				{all => {
					const visible = filterTasks(all, search, status);

					return visible.length === 0 ? (
						<EmptyState icon={Inbox} title={t('myDay.tasks.empty.title')} description={t('myDay.tasks.empty.description')} />
					) : (
						<Stack gap={3}>
							<DataTable caption={t('myDay.tasks.table.label')} columns={columns} rows={visible} getRowKey={task => task.id} />
							<Text size="sm" tone="muted">
								{t('myDay.tasks.footer.showing', { visible: visible.length, total: all.length })}
							</Text>
						</Stack>
					);
				}}
			</QueryView>

			<CreateTaskDialog open={creating} onClose={() => setCreating(false)} />
			<ConfirmDialog
				open={removing !== null}
				title={t('myDay.tasks.action.removeTask')}
				description={t('myDay.tasks.confirm.removeTask')}
				confirmLabel={t('myDay.tasks.action.removeTask')}
				tone="danger"
				loading={changeStatus.isPending}
				onCancel={() => setRemoving(null)}
				onConfirm={() => {
					if (removing !== null) {
						changeStatus.mutate({ task: removing, status: 'archived' }, { onSuccess: () => toast.success(t('myDay.tasks.toast.removed')) });
					}

					setRemoving(null);
				}}
			/>
		</Container>
	);
}
