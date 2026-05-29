import type { ReactElement } from 'react';
import { CalendarCheck2, CalendarDays, CalendarOff, Save } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { WorkingCalendarFeedback, WorkingCalendarLoading } from './WorkingCalendarFeedback';
import { WorkingDaysPanel } from './WorkingDaysPanel';
import { WorkspaceOffDayCreatePanel } from './WorkspaceOffDayCreatePanel';
import { WorkspaceOffDaysPanel } from './WorkspaceOffDaysPanel';
import { useWorkingCalendar } from './useWorkingCalendar';

/**
 * WorkingCalendarPage renders workspace working-day and off-day settings.
 */
export function WorkingCalendarPage(props: WorkspaceShellProps): ReactElement {
	const canManageCalendar = props.canManageWorkspace || props.isSystemAdmin;

	const calendar = useWorkingCalendar({
		workspace: props.workspace,
		canManageCalendar,
		refreshToken: props.workspaceCalendarRefreshToken,
		onCalendarChanged: props.onWorkspaceCalendarChanged,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={CalendarDays}
					label="Working days"
					value={String(calendar.selectedWeekdays.length)}
					helper={calendar.selectedWeekdayLabel}
				/>
				<CampfireStatCard icon={CalendarOff} label="Off-days" value={String(calendar.offDays.length)} helper="Workspace only" />
				<CampfireStatCard
					icon={CalendarCheck2}
					label="Upcoming"
					value={String(calendar.upcomingOffDayCount)}
					helper="Future off-days"
				/>
				<CampfireStatCard
					icon={Save}
					label="Draft state"
					value={calendar.changed ? 'Unsaved' : 'Saved'}
					helper={canManageCalendar ? 'Editable calendar' : 'Read only'}
					tone={calendar.changed ? 'red' : 'green'}
				/>
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Working calendar</p>
						<h3 className="campfire-surface-title">Working days and workspace off-days</h3>
						<p className="campfire-surface-description">
							Define the calendar rules Campfire uses before runtime decisions, reminders, and reports run.
						</p>
					</div>
					<CalendarDays className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<WorkingCalendarFeedback state={calendar.loadState} message={calendar.message} />

				{calendar.loadState === 'loading' && <WorkingCalendarLoading />}
			</CampfireSurface>

			{calendar.loadState !== 'loading' && (
				<>
					<WorkingDaysPanel
						selectedWeekdays={calendar.selectedWeekdays}
						disabled={calendar.isBusy}
						changed={calendar.changed}
						canManageCalendar={canManageCalendar}
						timezone={props.workspace.timezone}
						onChange={calendar.setSelectedWeekdays}
						onSave={calendar.saveWorkingDays}
					/>

					<div className="campfire-settings-split campfire-settings-split--calendar">
						<WorkspaceOffDayCreatePanel
							draft={calendar.offDayDraft}
							disabled={calendar.isBusy}
							canManageCalendar={canManageCalendar}
							timezone={props.workspace.timezone}
							onChange={calendar.updateOffDayDraft}
							onCreate={calendar.createOffDay}
						/>

						<WorkspaceOffDaysPanel
							offDays={calendar.sortedOffDays}
							disabled={calendar.isBusy}
							canManageCalendar={canManageCalendar}
							deletingOffDayID={calendar.deletingOffDayID}
							onDelete={calendar.deleteOffDay}
						/>
					</div>
				</>
			)}
		</div>
	);
}
