import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { WorkingCalendarFeedback, WorkingCalendarLoading } from './WorkingCalendarFeedback';
import { WorkingCalendarHero } from './WorkingCalendarHero';
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
		<div className="cf:grid cf:gap-5">
			<WorkingCalendarHero
				selectedWeekdayLabel={calendar.selectedWeekdayLabel}
				workingDayCount={calendar.selectedWeekdays.length}
				offDayCount={calendar.offDays.length}
				upcomingOffDayCount={calendar.upcomingOffDayCount}
				canManageCalendar={canManageCalendar}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<WorkingCalendarFeedback state={calendar.loadState} message={calendar.message} />

					{calendar.loadState === 'loading' && <WorkingCalendarLoading />}

					{calendar.loadState !== 'loading' && (
						<>
							<WorkingDaysPanel
								selectedWeekdays={calendar.selectedWeekdays}
								disabled={calendar.isBusy}
								changed={calendar.changed}
								canManageCalendar={canManageCalendar}
								onChange={calendar.setSelectedWeekdays}
								onSave={calendar.saveWorkingDays}
							/>

							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[0.9fr_1.1fr]">
								<WorkspaceOffDayCreatePanel
									draft={calendar.offDayDraft}
									disabled={calendar.isBusy}
									canManageCalendar={canManageCalendar}
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
