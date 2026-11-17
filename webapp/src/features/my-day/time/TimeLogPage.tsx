import { Clock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { addDays, formatDate } from '@/shared/lib/date';
import { useToday, useWorkspaceID } from '@/shared/session';
import {
	ConfirmDialog,
	Container,
	DataTable,
	EmptyState,
	Grid,
	IconButton,
	PageHeader,
	QueryView,
	Section,
	Stack,
	Text,
	toast,
} from '@/shared/ui';
import type { DataColumn } from '@/shared/ui';
import type { TimeEntry } from '@/shared/types/domain';

import { taskCanReceiveTime, useMyTasks } from '../tasks/tasks';
import { useMyTimeEntries, useTimeMutations } from './time';

const RECENT_DAYS = 14;
const RECENT_LIMIT = 20;

const schema = z.object({
	taskId: z.string().check(z.minLength(1, msg('myDay.time.validation.chooseTask'))),
	entryDate: z.string().check(z.minLength(1)),
	minutes: z.string().check(z.refine(value => Number.parseInt(value, 10) > 0, msg('myDay.time.validation.minutesPositive'))),
	note: z.string(),
});

/**
 * TimeLogPage records time against tasks and lists the most recent entries.
 */
export function TimeLogPage(): ReactElement {
	const { t, formatDuration, locale } = useI18n();
	const workspaceID = useWorkspaceID();
	const today = useToday();
	const tasks = useMyTasks(false);
	const entries = useMyTimeEntries(addDays(today, -RECENT_DAYS), today);
	const { log, remove } = useTimeMutations();
	const [deleting, setDeleting] = useState<TimeEntry | null>(null);

	const loggable = (tasks.data ?? []).filter(taskCanReceiveTime);
	const titleOf = (taskID: string): string => (tasks.data ?? []).find(task => task.id === taskID)?.title ?? t('myDay.time.task.unknown');

	const form = useAppForm({
		defaultValues: { taskId: '', entryDate: today, minutes: '30', note: '' },
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value, formApi }) => {
			const task = loggable.find(candidate => candidate.id === value.taskId);
			await log.mutateAsync({
				taskId: value.taskId,
				entryDate: value.entryDate,
				minutes: Number.parseInt(value.minutes, 10),
				note: value.note.trim(),
				projectId: task?.projectId ?? '',
				categoryId: task?.categoryId ?? '',
			});
			toast.success(t('myDay.time.toast.timeLogged'));
			formApi.reset({ ...value, minutes: '30', note: '' });
		},
	});

	const columns: readonly DataColumn<TimeEntry>[] = [
		{
			key: 'task',
			header: t('myDay.time.table.column.task'),
			render: entry => (
				<Text weight="bold" userContent truncate>
					{titleOf(entry.taskId)}
				</Text>
			),
		},
		{
			key: 'date',
			header: t('myDay.time.table.column.date'),
			render: entry => <Text tone="muted">{formatDate(entry.entryDate, locale)}</Text>,
		},
		{
			key: 'duration',
			header: t('myDay.time.table.column.duration'),
			render: entry => (
				<Text weight="bold" numeric>
					{formatDuration(entry.minutes)}
				</Text>
			),
		},
		{
			key: 'note',
			header: t('myDay.time.table.column.note'),
			render: entry => (
				<Text tone="muted" userContent>
					{entry.note.trim() === '' ? '—' : entry.note}
				</Text>
			),
		},
		{
			key: 'delete',
			header: t('common.delete'),
			align: 'end',
			render: entry => (
				<IconButton icon={Trash2} variant="ghost" label={t('myDay.time.action.deleteEntry')} onClick={() => setDeleting(entry)} />
			),
		},
	];

	return (
		<Container>
			<PageHeader
				eyebrow={t('myDay.time.page.eyebrow')}
				title={t('myDay.time.page.title')}
				description={t('myDay.time.page.description')}
			/>

			<Section divided title={t('myDay.time.log.title')} description={t('myDay.time.log.description')}>
				<form
					key={workspaceID}
					noValidate
					onSubmit={event => {
						event.preventDefault();
						submitForm(form);
					}}
				>
					<Stack gap={4}>
						<form.AppField name="taskId">
							{field => (
								<field.ComboboxField
									required
									label={t('myDay.time.field.task')}
									options={loggable.map(task => ({ value: task.id, label: task.title }))}
									placeholder={t('myDay.time.field.task.placeholder')}
									emptyText={t('myDay.time.empty.title')}
								/>
							)}
						</form.AppField>
						<Grid columns={2}>
							<form.AppField name="entryDate">
								{field => <field.DatePickerField required label={t('myDay.time.field.entryDate')} max={today} />}
							</form.AppField>
							<form.AppField name="minutes">{field => <field.NumberField required label={t('myDay.time.field.minutes')} />}</form.AppField>
						</Grid>
						<form.AppField name="note">
							{field => (
								<field.TextField userContent label={t('myDay.time.field.note')} placeholder={t('myDay.time.field.note.placeholder')} />
							)}
						</form.AppField>
						<div>
							<form.AppForm>
								<form.SubmitButton icon={Clock} label={t('myDay.time.action.saveEntry')} />
							</form.AppForm>
						</div>
					</Stack>
				</form>
			</Section>

			<Section divided title={t('myDay.time.recent.title')}>
				<QueryView query={entries}>
					{all => {
						const recent = [...all]
							.sort((first, second) => second.entryDate.localeCompare(first.entryDate) || second.createdAt.localeCompare(first.createdAt))
							.slice(0, RECENT_LIMIT);

						return recent.length === 0 ? (
							<EmptyState title={t('myDay.time.empty.title')} description={t('myDay.time.empty.description')} />
						) : (
							<Stack gap={3}>
								<DataTable caption={t('myDay.time.table.label')} columns={columns} rows={recent} getRowKey={entry => entry.id} />
								<Text size="sm" tone="muted">
									{t('myDay.time.footer.showing', { visible: recent.length, total: all.length })}
								</Text>
							</Stack>
						);
					}}
				</QueryView>
			</Section>

			<ConfirmDialog
				open={deleting !== null}
				title={t('myDay.time.action.deleteEntry')}
				description={t('myDay.time.confirm.deleteEntry')}
				confirmLabel={t('common.delete')}
				tone="danger"
				loading={remove.isPending}
				onCancel={() => setDeleting(null)}
				onConfirm={() => {
					if (deleting !== null) {
						remove.mutate(deleting.id, { onSuccess: () => toast.success(t('myDay.time.toast.entryDeleted')) });
					}

					setDeleting(null);
				}}
			/>
		</Container>
	);
}
