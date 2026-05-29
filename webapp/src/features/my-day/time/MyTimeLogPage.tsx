import { useMemo, type ReactElement } from 'react';
import { CalendarRange, Clock3, Inbox, ListChecks, Plus } from 'lucide-react';

import {
	CampfireBackButton,
	CampfireEmptyState,
	CampfireFieldError,
	CampfirePageHeader,
	CampfireStatCard,
	CampfireSurface,
} from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TimeEntry, Workspace } from '@/types/domain';

import { formatMinutes, taskLabelForID } from './my-time.helpers';
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
	const timeLog = useMyTimeLog({ workspace: props.workspace });
	const recentEntries = useMemo(() => timeLog.timeEntries.slice(0, 20), [timeLog.timeEntries]);

	return (
		<div className="campfire-page-stack">
			{props.onBack !== undefined && (
				<CampfireBackButton onClick={props.onBack}>Back to My Day</CampfireBackButton>
			)}

			<CampfirePageHeader
				title="Time Log"
				description="Track and review the time you have spent on Campfire tasks."
				actions={
					<Button type="button" onClick={() => void timeLog.submitTimeEntry()} disabled={timeLog.isBusy}>
						<Plus className="cf:size-4" />
						Save entry
					</Button>
				}
			/>

			<div className="campfire-stat-grid campfire-stat-grid--three">
				<CampfireStatCard icon={Clock3} label="Recent total" value={formatMinutes(timeLog.totalRecentMinutes)} helper="Last loaded range" />
				<CampfireStatCard icon={ListChecks} label="Loggable tasks" value={String(timeLog.loggableTasks.length)} helper="Active, blocked, or completed" tone="green" />
				<CampfireStatCard icon={CalendarRange} label="Entries" value={String(timeLog.timeEntries.length)} helper="Recent entries" tone="blue" />
			</div>

			<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />
			{timeLog.loadState === 'loading' && <MyTimeLoading />}

			<div className="campfire-time-layout">
				<CampfireSurface className="campfire-table-surface">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">Recent entries</h3>
							<p className="campfire-surface-description">Loaded from the existing personal time-entry API.</p>
						</div>
					</div>

					<div className="campfire-data-table campfire-data-table--time" role="table" aria-label="My time entries">
						<div className="campfire-data-table-row campfire-data-table-row--head" role="row">
							<span role="columnheader">Task</span>
							<span role="columnheader">Date</span>
							<span role="columnheader">Duration</span>
							<span role="columnheader">Note</span>
						</div>

						{recentEntries.map(entry => (
							<TimeEntryRow key={entry.id} entry={entry} taskTitle={taskLabelForID(timeLog.tasksByID, entry.taskId)} />
						))}

						{recentEntries.length === 0 && (
							<div className="campfire-data-table-empty">
								<CampfireEmptyState
									icon={Inbox}
									title="No time entries yet"
									description="Log time against one of your tasks when work is ready to track."
								/>
							</div>
						)}
					</div>

					<p className="campfire-table-footer">Showing {recentEntries.length} of {timeLog.timeEntries.length} entries</p>
				</CampfireSurface>

				<CampfireSurface className="campfire-time-entry-panel">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">Log time</h3>
							<p className="campfire-surface-description">Create a manual time entry against a task.</p>
						</div>
					</div>

					<div className="campfire-form-stack">
						<label className="campfire-form-field">
							<span>Task</span>
							<CampfireSelect
								id="campfire-time-log-task"
								value={timeLog.timeDraft.taskId}
								disabled={timeLog.isBusy || timeLog.loggableTasks.length === 0}
								onValueChange={timeLog.handleTimeTaskChange}
								searchable={true}
								searchPlaceholder="Search tasks…"
								maxVisibleOptions={50}
							>
								<option value="">Choose a task…</option>
								{timeLog.loggableTasks.map(task => (
									<option key={task.id} value={task.id}>
										{task.title}
									</option>
								))}
							</CampfireSelect>
							<CampfireFieldError message={timeLog.timeDraftErrors.taskId} />
						</label>

						<label className="campfire-form-field">
							<span>Entry date</span>
							<CampfireDateInput
								id="campfire-time-log-date"
								disabled={timeLog.isBusy}
								timezone={props.workspace.timezone}
								value={timeLog.timeDraft.entryDate}
								onValueChange={value => timeLog.updateTimeDraft({ entryDate: value })}
							/>
						</label>

						<label className="campfire-form-field">
							<span>Minutes</span>
							<Input
								type="number"
								min="1"
								step="5"
								value={timeLog.timeDraft.minutes}
								disabled={timeLog.isBusy}
								aria-invalid={timeLog.timeDraftErrors.minutes !== undefined}
								onChange={event => timeLog.updateTimeDraft({ minutes: event.currentTarget.value })}
							/>
							<CampfireFieldError message={timeLog.timeDraftErrors.minutes} />
						</label>

						<label className="campfire-form-field">
							<span>Note</span>
							<Textarea
								value={timeLog.timeDraft.note}
								disabled={timeLog.isBusy}
								placeholder="Optional note for this entry"
								onChange={event => timeLog.updateTimeDraft({ note: event.currentTarget.value })}
							/>
						</label>
					</div>

					<div className="campfire-form-actions">
						<Button type="button" disabled={timeLog.isBusy} onClick={() => void timeLog.submitTimeEntry()}>
							Save entry
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
function TimeEntryRow(props: { readonly entry: TimeEntry; readonly taskTitle: string }): ReactElement {
	return (
		<div className="campfire-data-table-row" role="row">
			<span className="campfire-task-title-cell" role="cell">
				<strong>{props.taskTitle}</strong>
				{props.entry.projectId.trim() !== '' && <small>{props.entry.projectId}</small>}
			</span>
			<span className="campfire-muted-cell" role="cell">{props.entry.entryDate}</span>
			<span role="cell">{formatMinutes(props.entry.minutes)}</span>
			<span className="campfire-muted-cell" role="cell">{props.entry.note.trim() === '' ? '—' : props.entry.note}</span>
		</div>
	);
}
