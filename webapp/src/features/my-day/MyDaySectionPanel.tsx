import type { ReactElement } from 'react';

import { LeaveRequestCard } from '@/app/LeaveRequestCard';
import { MyPendingLeavesCard } from '@/app/MyPendingLeavesCard';
import { TasksAndTimeCard } from '@/app/TasksAndTimeCard';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import type { MyDaySectionID } from './my-day.types';
import { MyStandupPage } from './standup/MyStandupPage';

/**
 * MyDaySectionPanelProps contains the selected personal workflow section.
 */
type MyDaySectionPanelProps = WorkspaceShellProps & {
	readonly activeSectionID: MyDaySectionID;
};

/**
 * MyDaySectionPanel renders exactly one personal workflow page.
 */
export function MyDaySectionPanel(props: MyDaySectionPanelProps): ReactElement {
	switch (props.activeSectionID) {
		case 'check-in':
			return (
				<section aria-label="My standup">
					<MyStandupPage workspace={props.workspace} onStandupSubmitted={props.onStandupSubmitted} />
				</section>
			);

		case 'time-log':
			return (
				<section aria-label="My tasks and time">
					<TasksAndTimeCard workspace={props.workspace} />
				</section>
			);

		case 'leave':
			return (
				<section className="cf:grid cf:gap-5" aria-label="My leave">
					<LeaveRequestCard workspace={props.workspace} onLeaveCreated={props.onLeaveCreated} />

					<MyPendingLeavesCard
						workspace={props.workspace}
						refreshToken={props.leaveRefreshToken}
						onLeaveCancelled={props.onLeaveCancelled}
					/>
				</section>
			);
	}
}
