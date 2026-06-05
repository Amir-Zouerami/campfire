import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';

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
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow="Working calendar"
				title="Working days and workspace off-days"
				description="Choose the weekly pattern Campfire should respect, then add dates that should be skipped for this workspace."
			/>

			<WorkingCalendarFeedback state={calendar.loadState} message={calendar.message} />
			{calendar.loadState === 'loading' && <WorkingCalendarLoading />}

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

					<div className="campfire-settings-split campfire-settings-split--calendar campfire-settings-split--flat">
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
