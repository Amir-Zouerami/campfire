import { useMemo, type ReactElement } from 'react';
import { Inbox, Plus } from 'lucide-react';

import { CampfireDataTable, CampfireDataTableCell, CampfireDataTableRow } from '@/components/campfire/CampfireDataTable';
import {
	CampfireBackButton,
	CampfireEmptyState,
	CampfireFieldError,
	CampfireSurface,
} from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import {
	CampfireResponsiveInput,
	CampfireResponsiveTextarea,
} from '@/components/campfire/CampfireResponsiveInput';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { TimeEntry, Workspace } from '@/types/domain';

import { taskLabelForID } from './my-time.helpers';
import { formatLocalizedMinutes } from './my-time.i18n';
import { MyTimeFeedback, MyTimeLoading } from './MyTimeFeedback';
import { useMyTimeLog } from './useMyTimeLog';

/**
 * MyTimeLogPageProps contains workspace context and back navigation.
 */
type MyTimeLogPageProps = {
	readonly workspace: Workspace;
	readonly onBack?: () => void;
};

/**
 * MyTimeLogPage renders the dedicated personal time entry page.
 */
export function MyTimeLogPage(props: MyTimeLogPageProps): ReactElement {
	const { t } = useI18n();
	const timeLog = useMyTimeLog({
		workspace: props.workspace,
		text: {
			taskCreated: t('myDay.time.toast.taskCreated'),
			timeLogged: t('myDay.time.toast.timeLogged'),
			taskTitleRequired: t('myDay.time.validation.taskTitleRequired'),
			chooseTask: t('myDay.time.validation.chooseTask'),
			minutesPositive: t('myDay.time.validation.minutesPositive'),
			fallbackError: t('myDay.time.error.fallback'),
		},
	});
	const recentEntries = useMemo(
		() => sortByNewest(timeLog.timeEntries, entry => entry.entryDate || entry.createdAt).slice(0, 20),
		[timeLog.timeEntries],
	);

	return (
		<div className="campfire-page-stack">
			{props.onBack !== undefined && (
				<CampfireBackButton onClick={props.onBack}>{t('common.backToMyDay')}</CampfireBackButton>
			)}

			<CampfirePageIntro
				eyebrow={t('myDay.time.page.eyebrow')}
				title={t('myDay.time.page.title')}
				description={t('myDay.time.page.description')}
				actions={
					<Button type="button" onClick={() => void timeLog.submitTimeEntry()} disabled={timeLog.isBusy}>
						<Plus className="cf:size-4" />
						{t('myDay.time.action.saveEntry')}
					</Button>
				}
			/>

			<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />
			{timeLog.loadState === 'loading' && <MyTimeLoading />}

			<div className="campfire-time-layout">
				<CampfireSurface className="campfire-table-surface campfire-readable-table-surface">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">{t('myDay.time.recent.title')}</h3>
						</div>
					</div>

					<CampfireDataTable
						label={t('myDay.time.table.label')}
						columns={[
							t('myDay.time.table.column.task'),
							t('myDay.time.table.column.date'),
							t('myDay.time.table.column.duration'),
							t('myDay.time.table.column.note'),
						]}
						className="campfire-data-table--time"
						empty={recentEntries.length === 0 ? (
							<CampfireEmptyState
								icon={Inbox}
								title={t('myDay.time.empty.title')}
								description={t('myDay.time.empty.description')}
							/>
						) : undefined}
						footer={<>{t('myDay.time.footer.showing', { visible: recentEntries.length, total: timeLog.timeEntries.length })}</>}
					>
						{recentEntries.map(entry => (
							<TimeEntryRow
								key={entry.id}
								entry={entry}
								taskTitle={taskLabelForID(timeLog.tasksByID, entry.taskId, t('myDay.time.task.unknown'))}
							/>
						))}
					</CampfireDataTable>
				</CampfireSurface>

				<CampfireSurface className="campfire-time-entry-panel">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">{t('myDay.time.log.title')}</h3>
							<p className="campfire-surface-description">{t('myDay.time.log.description')}</p>
						</div>
					</div>

					<div className="campfire-form-stack">
						<label className="campfire-form-field">
							<span>{t('myDay.time.field.task')}</span>
							<CampfireSelect
								id="campfire-time-log-task"
								value={timeLog.timeDraft.taskId}
								disabled={timeLog.isBusy || timeLog.loggableTasks.length === 0}
								onValueChange={timeLog.handleTimeTaskChange}
								searchable={true}
								searchPlaceholder={t('myDay.time.searchTasks.placeholder')}
								maxVisibleOptions={50}
							>
								<option value="">{t('myDay.time.field.task.placeholder')}</option>
								{timeLog.loggableTasks.map(task => (
									<option key={task.id} value={task.id}>
										{task.title}
									</option>
								))}
							</CampfireSelect>
							<CampfireFieldError message={timeLog.timeDraftErrors.taskId} />
						</label>

						<label className="campfire-form-field">
							<span>{t('myDay.time.field.entryDate')}</span>
							<CampfireDateInput
								id="campfire-time-log-date"
								disabled={timeLog.isBusy}
								timezone={props.workspace.timezone}
								workingDays={props.workspace.workingDays}
								value={timeLog.timeDraft.entryDate}
								onValueChange={value => timeLog.updateTimeDraft({ entryDate: value })}
							/>
						</label>

						<label className="campfire-form-field">
							<span>{t('myDay.time.field.minutes')}</span>
							<CampfireResponsiveInput
								type="number"
								min="1"
								step="5"
								value={timeLog.timeDraft.minutes}
								disabled={timeLog.isBusy}
								aria-invalid={timeLog.timeDraftErrors.minutes !== undefined}
								onValueChange={value => timeLog.updateTimeDraft({ minutes: value })}
							/>
							<CampfireFieldError message={timeLog.timeDraftErrors.minutes} />
						</label>

						<label className="campfire-form-field">
							<span>{t('myDay.time.field.note')}</span>
							<CampfireResponsiveTextarea
								value={timeLog.timeDraft.note}
								disabled={timeLog.isBusy}
								placeholder={t('myDay.time.field.note.placeholder')}
								onValueChange={value => timeLog.updateTimeDraft({ note: value })}
							/>
						</label>
					</div>

					<div className="campfire-form-actions">
						<Button type="button" disabled={timeLog.isBusy} onClick={() => void timeLog.submitTimeEntry()}>
							{t('myDay.time.action.saveEntry')}
						</Button>
					</div>
				</CampfireSurface>
			</div>
		</div>
	);
}

/**
 * TimeEntryRow renders one recent time entry.
 */
function TimeEntryRow(props: {
	readonly entry: TimeEntry;
	readonly taskTitle: string;
}): ReactElement {
	const { t } = useI18n();

	return (
		<CampfireDataTableRow>
			<CampfireDataTableCell className="campfire-task-title-cell">
				<strong><CampfireEllipsisText value={props.taskTitle} /></strong>
				{props.entry.projectId.trim() !== '' && (
					<small><CampfireEllipsisText value={props.entry.projectId} /></small>
				)}
			</CampfireDataTableCell>
			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={props.entry.entryDate} />
			</CampfireDataTableCell>
			<CampfireDataTableCell>
				<CampfireEllipsisText value={formatLocalizedMinutes(props.entry.minutes, t)} />
			</CampfireDataTableCell>
			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={props.entry.note.trim() === '' ? '—' : props.entry.note} />
			</CampfireDataTableCell>
		</CampfireDataTableRow>
	);
}
