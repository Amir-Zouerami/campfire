import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { CampfirePageHeader } from '@/components/campfire/CampfireLayoutPrimitives';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { TeamAvailabilityPage } from './availability/TeamAvailabilityPage';
import { TeamLeaveApprovalsPage } from './leave-approvals/TeamLeaveApprovalsPage';
import { RestrictedTeamReviewState } from './RestrictedTeamReviewState';
import { TeamRuntimePage } from './runtime/TeamRuntimePage';
import { TeamStandupsPage } from './standups/TeamStandupsPage';
import { TeamReviewSectionNavigation } from './TeamReviewSectionNavigation';
import { resolveTeamReviewSection, visibleTeamReviewSections } from './team-review.helpers';
import type { TeamReviewSectionID } from './team-review.types';

/**
 * TeamReviewPage renders operational review pages for Leads, Approvers, and Admins.
 */
export function TeamReviewPage(props: WorkspaceShellProps): ReactElement {
	const [activeSection, setActiveSection] = useState<TeamReviewSectionID>('standups');

	const visibleSections = useMemo(() => {
		return visibleTeamReviewSections(props);
	}, [props]);

	const resolvedSection = useMemo(() => {
		return resolveTeamReviewSection(activeSection, visibleSections);
	}, [activeSection, visibleSections]);

	if (resolvedSection === null) {
		return <RestrictedTeamReviewState />;
	}

	return (
		<div className="campfire-page-stack">
			<CampfirePageHeader
				eyebrow="Team Review"
				title={resolvedSection.label}
				description={resolvedSection.description}
			/>

			<TeamReviewSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			{renderTeamReviewSection(resolvedSection.id, props)}
		</div>
	);
}

/**
 * renderTeamReviewSection renders the selected team-review workflow without an
 * extra pass-through section panel component.
 */
function renderTeamReviewSection(activeSection: TeamReviewSectionID, props: WorkspaceShellProps): ReactElement {
	switch (activeSection) {
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
