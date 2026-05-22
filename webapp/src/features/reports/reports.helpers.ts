import { cn } from '@/lib/utils';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { reportSections } from './reports.sections';
import type { ReportsSection, ReportsSectionID } from './reports.types';

/**
 * canViewReportsPage returns whether the current user can access Reports.
 */
export function canViewReportsPage(props: WorkspaceShellProps): boolean {
	return (
		props.isSystemAdmin ||
		props.canManageWorkspace ||
		props.capabilities.canViewWorkspaceReports ||
		props.capabilities.canViewGlobalReports
	);
}

/**
 * visibleReportSections returns report sections available to the current user.
 */
export function visibleReportSections(props: WorkspaceShellProps): readonly ReportsSection[] {
	return reportSections.filter(section => reportSectionIsVisible(section, props));
}

/**
 * reportSectionIsVisible returns whether the current user can access a report section.
 */
export function reportSectionIsVisible(section: ReportsSection, props: WorkspaceShellProps): boolean {
	if (section.globalOnly) {
		return props.isSystemAdmin || props.capabilities.canViewGlobalReports;
	}

	return props.isSystemAdmin || props.canManageWorkspace || props.capabilities.canViewWorkspaceReports;
}

/**
 * resolveReportSection keeps the active report section valid when access changes.
 */
export function resolveReportSection(
	activeSection: ReportsSectionID,
	visibleSections: readonly ReportsSection[],
): ReportsSection | null {
	const matchingSection = visibleSections.find(section => section.id === activeSection);

	if (matchingSection !== undefined) {
		return matchingSection;
	}

	return (
		visibleSections.find(section => section.id === 'daily') ??
		visibleSections.find(section => section.id === 'global') ??
		null
	);
}

/**
 * reportSectionButtonClassName returns report sub-page button classes.
 */
export function reportSectionButtonClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-w-[220px] cf:flex-1 cf:flex-col cf:items-start cf:gap-1 cf:rounded-2xl cf:border cf:px-5 cf:py-4 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.04] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.06]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.10] cf:shadow-lg',
	);
}
