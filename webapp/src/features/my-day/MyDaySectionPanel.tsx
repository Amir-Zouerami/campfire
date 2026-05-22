import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { MyLeavePage } from './leave/MyLeavePage';
import type { MyDaySectionID } from './my-day.types';
import { MyStandupPage } from './standup/MyStandupPage';
import { MyTimePage } from './time/MyTimePage';

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
					<MyTimePage workspace={props.workspace} />
				</section>
			);

		case 'leave':
			return (
				<section aria-label="My leave">
					<MyLeavePage
						workspace={props.workspace}
						onLeaveCreated={props.onLeaveCreated}
						onLeaveCancelled={props.onLeaveCancelled}
					/>
				</section>
			);
	}
}
