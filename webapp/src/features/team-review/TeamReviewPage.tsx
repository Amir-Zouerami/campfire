import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { RestrictedTeamReviewState } from './RestrictedTeamReviewState';
import { TeamReviewSectionNavigation } from './TeamReviewSectionNavigation';
import { TeamReviewSectionPanel } from './TeamReviewSectionPanel';
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
		<div className="cf:grid cf:gap-4">
			<TeamReviewSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			<TeamReviewSectionPanel activeSection={resolvedSection.id} {...props} />
		</div>
	);
}
