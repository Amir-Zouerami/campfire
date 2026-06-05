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
import { sortByNewest } from '@/lib/sort';
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
	const recentEntries = useMemo(
		() => sortByNewest(timeLog.timeEntries, entry => entry.entryDate || entry.createdAt).slice(0, 20),
		[timeLog.timeEntries],
	);

	return (
		<div className="campfire-page-stack">
			{props.onBack !== undefined && (
				<CampfireBackButton onClick={props.onBack}>Back to My Day</CampfireBackButton>
			)}

			<CampfirePageIntro
				eyebrow="Time log"
				title="Track time against tasks"
				description="Add time entries and review recent work."
				actions={
					<Button type="button" onClick={() => void timeLog.submitTimeEntry()} disabled={timeLog.isBusy}>
						<Plus className="cf:size-4" />
						Save entry
					</Button>
				}
			/>

			<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />
			{timeLog.loadState === 'loading' && <MyTimeLoading />}

			<div className="campfire-time-layout">
				<CampfireSurface className="campfire-table-surface campfire-readable-table-surface">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">Recent entries</h3>
						</div>
					</div>

					<CampfireDataTable
						label="My time entries"
						columns={['Task', 'Date', 'Duration', 'Note']}
						className="campfire-data-table--time"
						empty={recentEntries.length === 0 ? (
							<CampfireEmptyState
								icon={Inbox}
								title="No time entries yet"
								description="Log time against one of your tasks when work is ready to track."
							/>
						) : undefined}
						footer={<>Showing {recentEntries.length} of {timeLog.timeEntries.length} entries</>}
					>
						{recentEntries.map(entry => (
							<TimeEntryRow
								key={entry.id}
								entry={entry}
								taskTitle={taskLabelForID(timeLog.tasksByID, entry.taskId)}
							/>
						))}
					</CampfireDataTable>
				</CampfireSurface>

				<CampfireSurface className="campfire-time-entry-panel">
					<div className="campfire-surface-header">
						<div>
							<h3 className="campfire-surface-title">Log time</h3>
							<p className="campfire-surface-description">Choose a task, date, and duration.</p>
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
							<span>Note</span>
							<CampfireResponsiveTextarea
								value={timeLog.timeDraft.note}
								disabled={timeLog.isBusy}
								placeholder="Optional note for this entry"
								onValueChange={value => timeLog.updateTimeDraft({ note: value })}
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
function TimeEntryRow(props: {
	readonly entry: TimeEntry;
	readonly taskTitle: string;
}): ReactElement {
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
				<CampfireEllipsisText value={formatMinutes(props.entry.minutes)} />
			</CampfireDataTableCell>
			<CampfireDataTableCell className="campfire-muted-cell">
				<CampfireEllipsisText value={props.entry.note.trim() === '' ? '—' : props.entry.note} />
			</CampfireDataTableCell>
		</CampfireDataTableRow>
	);
}
