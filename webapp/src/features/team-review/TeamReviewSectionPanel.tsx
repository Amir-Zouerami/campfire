import type { ReactElement } from 'react';

import { ApprovedLeavesCard } from '@/app/ApprovedLeavesCard';
import { LeaveApprovalsCard } from '@/app/LeaveApprovalsCard';
import { StandupRuntimeCard } from '@/app/StandupRuntimeCard';
import { StandupSubmissionsCard } from '@/app/StandupSubmissionsCard';
import { WhoIsOutCard } from '@/app/WhoIsOutCard';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

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
			return <StandupSubmissionsCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'availability':
			return (
				<div className="cf:grid cf:gap-5">
					<WhoIsOutCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
					<ApprovedLeavesCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
				</div>
			);

		case 'approvals':
			return (
				<LeaveApprovalsCard
					workspace={props.workspace}
					refreshToken={props.leaveRefreshToken}
					onLeaveDecided={props.onLeaveDecided}
				/>
			);

		case 'runtime':
			return (
				<StandupRuntimeCard workspace={props.workspace} refreshToken={props.workspaceCalendarRefreshToken} />
			);
	}
}
