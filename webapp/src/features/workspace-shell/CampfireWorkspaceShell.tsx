import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BarChart3, CalendarCheck, Flame, Settings2 } from 'lucide-react';

import { CampfireCardHeader, CampfirePanel, CampfireStatusPill } from '@/app/campfire-ui';
import { cn } from '@/lib/utils';

import { MyDayPage } from '@/features/my-day/MyDayPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TeamReviewPage } from '@/features/team-review/TeamReviewPage';

import type { WorkspacePageDefinition, WorkspacePageID, WorkspaceShellProps } from './workspace-shell.types';

/**
 * workspacePages defines the redesigned Campfire workspace information architecture.
 */
const workspacePages: readonly WorkspacePageDefinition[] = [
	{
		id: 'my-day',
		label: 'My Day',
		eyebrow: 'Personal workflow',
		title: 'My Day',
		description: 'Standup, tasks, time, and personal leave.',
		managerOnly: false,
	},
	{
		id: 'team-review',
		label: 'Team Review',
		eyebrow: 'Lead workspace',
		title: 'Team Review',
		description: 'Submissions, availability, approvals, and runtime decisions.',
		managerOnly: true,
	},
	{
		id: 'reports',
		label: 'Reports',
		eyebrow: 'Markdown and CSV',
		title: 'Reports',
		description: 'Preview reports, export CSV, and reuse saved filters.',
		managerOnly: true,
	},
	{
		id: 'settings',
		label: 'Settings',
		eyebrow: 'Configuration',
		title: 'Settings',
		description: 'Roles, calendar, standup forms, reminders, report rules, and audit history.',
		managerOnly: true,
	},
];

/**
 * CampfireWorkspaceShell renders the redesigned role-aware workspace application.
 */
export function CampfireWorkspaceShell(props: WorkspaceShellProps): ReactElement {
	const [activePage, setActivePage] = useState<WorkspacePageID>('my-day');

	const visiblePages = useMemo(() => {
		return workspacePages.filter(page => pageIsVisible(page, props));
	}, [props]);

	const activeDefinition = useMemo(() => {
		return resolveActivePage(activePage, visiblePages);
	}, [activePage, visiblePages]);

	return (
		<section className="campfire-workspace-shell">
			<WorkspaceHeader {...props} activePage={activeDefinition} />

			<WorkspaceNavigation activePage={activeDefinition.id} pages={visiblePages} onSelectPage={setActivePage} />

			<WorkspacePage activePage={activeDefinition.id} {...props} />
		</section>
	);
}

/**
 * WorkspaceHeader renders compact workspace context without a second metric row.
 */
function WorkspaceHeader(props: WorkspaceShellProps & { readonly activePage: WorkspacePageDefinition }): ReactElement {
	return (
		<CampfirePanel className="campfire-workspace-header-panel">
			<CampfireCardHeader
				eyebrow={props.activePage.eyebrow}
				title={props.activePage.title}
				description={props.activePage.description}
				icon={iconForPage(props.activePage.id)}
				action={
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<CampfireStatusPill tone={props.canManageWorkspace ? 'green' : 'slate'}>
							{accessLabel(props)}
						</CampfireStatusPill>

						{props.isSystemAdmin && <CampfireStatusPill tone="ember">System admin</CampfireStatusPill>}
					</div>
				}
			/>
		</CampfirePanel>
	);
}

/**
 * WorkspaceNavigation renders the main workspace page navigation.
 */
function WorkspaceNavigation(props: {
	readonly activePage: WorkspacePageID;
	readonly pages: readonly WorkspacePageDefinition[];
	readonly onSelectPage: (page: WorkspacePageID) => void;
}): ReactElement {
	return (
		<nav className="campfire-tab-grid" aria-label="Campfire workspace pages">
			{props.pages.map(page => {
				const isActive = page.id === props.activePage;
				const Icon = iconForPage(page.id);

				return (
					<button
						key={page.id}
						type="button"
						aria-current={isActive ? 'page' : undefined}
						className={cn('campfire-tab-button', isActive && 'campfire-tab-button--active')}
						onClick={() => props.onSelectPage(page.id)}
					>
						<span className={cn('campfire-tab-icon', isActive && 'campfire-tab-icon--active')}>
							<Icon className="cf:size-7" />
						</span>

						<span className="campfire-tab-copy">
							<span className="campfire-tab-label">{page.label}</span>
							<span className="campfire-tab-eyebrow">{page.eyebrow}</span>
						</span>
					</button>
				);
			})}
		</nav>
	);
}

/**
 * WorkspacePage renders the active top-level workspace page.
 */
function WorkspacePage(props: WorkspaceShellProps & { readonly activePage: WorkspacePageID }): ReactElement {
	switch (props.activePage) {
		case 'my-day':
			return <MyDayPage {...props} />;

		case 'team-review':
			return <TeamReviewPage {...props} />;

		case 'reports':
			return <ReportsPage {...props} />;

		case 'settings':
			return <SettingsPage {...props} />;
	}
}

/**
 * pageIsVisible returns whether the current user can see a top-level page.
 */
function pageIsVisible(page: WorkspacePageDefinition, props: WorkspaceShellProps): boolean {
	if (!page.managerOnly) {
		return true;
	}

	if (props.isSystemAdmin || props.canManageWorkspace) {
		return true;
	}

	if (page.id === 'team-review') {
		return props.capabilities.canApproveLeaves;
	}

	if (page.id === 'reports') {
		return props.capabilities.canViewWorkspaceReports || props.capabilities.canViewGlobalReports;
	}

	return false;
}

/**
 * resolveActivePage keeps the active page valid when capabilities change.
 */
function resolveActivePage(
	activePage: WorkspacePageID,
	visiblePages: readonly WorkspacePageDefinition[],
): WorkspacePageDefinition {
	const matchingPage = visiblePages.find(page => page.id === activePage);

	if (matchingPage !== undefined) {
		return matchingPage;
	}

	const myDayPage = visiblePages.find(page => page.id === 'my-day');

	if (myDayPage !== undefined) {
		return myDayPage;
	}

	throw new Error('Campfire workspace shell has no visible pages.');
}

/**
 * iconForPage returns the icon for a workspace page.
 */
function iconForPage(page: WorkspacePageID): typeof Flame {
	switch (page) {
		case 'my-day':
			return Flame;

		case 'team-review':
			return CalendarCheck;

		case 'reports':
			return BarChart3;

		case 'settings':
			return Settings2;
	}
}

/**
 * accessLabel returns the current user's readable workspace access label.
 */
function accessLabel(props: WorkspaceShellProps): string {
	if (props.isSystemAdmin) {
		return 'Admin';
	}

	if (props.canManageWorkspace) {
		return 'Lead';
	}

	if (props.capabilities.canApproveLeaves) {
		return 'Approver';
	}

	if (props.capabilities.canViewWorkspaceReports) {
		return 'Viewer';
	}

	return 'Member';
}
