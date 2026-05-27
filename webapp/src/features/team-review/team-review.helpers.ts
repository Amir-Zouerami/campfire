import { cn } from '@/lib/utils';

import { teamReviewSections } from './team-review.sections';
import type { TeamReviewSection, TeamReviewSectionID } from './team-review.types';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

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

/**
 * teamReviewSectionButtonClassName returns sub-page button classes.
 */
export function teamReviewSectionButtonClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-w-0 cf:w-full cf:flex-col cf:items-start cf:justify-center cf:gap-1 cf:rounded-2xl cf:border cf:px-5 cf:py-4 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.04] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.06]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.10] cf:shadow-lg',
	);
}
