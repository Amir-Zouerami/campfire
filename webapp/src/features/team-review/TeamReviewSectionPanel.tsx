import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { TeamAvailabilityPage } from './availability/TeamAvailabilityPage';
import { TeamLeaveApprovalsPage } from './leave-approvals/TeamLeaveApprovalsPage';
import { TeamRuntimePage } from './runtime/TeamRuntimePage';
import { TeamStandupsPage } from './standups/TeamStandupsPage';
import type { TeamReviewSectionID } from './team-review.types';

/**
 * TeamReviewSectionPanelProps contains the selected Team Review section.
 */
type TeamReviewSectionPanelProps = WorkspaceShellProps & {
	readonly activeSection: TeamReviewSectionID;
};

/**
 * TeamReviewSectionPanel renders the selected Team Review sub-page.
 */
export function TeamReviewSectionPanel(props: TeamReviewSectionPanelProps): ReactElement {
	switch (props.activeSection) {
		case 'standups':
			return <TeamStandupsPage workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'availability':
			return <TeamAvailabilityPage workspace={props.workspace} refreshToken={props.leaveRefreshToken} />;

		case 'approvals':
			return (
				<TeamLeaveApprovalsPage
					workspace={props.workspace}
					refreshToken={props.leaveRefreshToken}
					onLeaveDecided={props.onLeaveDecided}
				/>
			);

		case 'runtime':
			return <TeamRuntimePage workspace={props.workspace} refreshToken={props.workspaceCalendarRefreshToken} />;
	}
}
