import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { teamReviewSections } from './team-review.sections';
import type { TeamReviewSection, TeamReviewSectionID } from './team-review.types';

/**
 * visibleTeamReviewSections returns the Team Review sections available to the current user.
 */
export function visibleTeamReviewSections(props: WorkspaceShellProps): readonly TeamReviewSection[] {
	return teamReviewSections.filter(section => teamReviewSectionIsVisible(section, props));
}

/**
 * teamReviewSectionIsVisible returns whether the current user can access one Team Review section.
 */
export function teamReviewSectionIsVisible(section: TeamReviewSection, props: WorkspaceShellProps): boolean {
	if (props.isSystemAdmin || props.canManageWorkspace) {
		return true;
	}

	if (section.approverOnly) {
		return props.capabilities.canApproveLeaves;
	}

	if (section.managerOnly) {
		return false;
	}

	return true;
}

/**
 * resolveTeamReviewSection keeps the active section valid when access changes.
 */
export function resolveTeamReviewSection(
	activeSection: TeamReviewSectionID,
	visibleSections: readonly TeamReviewSection[],
): TeamReviewSection | null {
	const matchingSection = visibleSections.find(section => section.id === activeSection);

	if (matchingSection !== undefined) {
		return matchingSection;
	}

	const approvalSection = visibleSections.find(section => section.id === 'approvals');

	if (approvalSection !== undefined) {
		return approvalSection;
	}

	return visibleSections.find(section => section.id === 'standups') ?? null;
}
