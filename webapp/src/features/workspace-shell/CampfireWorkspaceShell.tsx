import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BarChart3, CalendarCheck, Flame, RefreshCw, SlidersHorizontal, X } from 'lucide-react';

import campfireLogoURL from '../../../../assets/campfire-logo.svg';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CampfireUserAvatar } from '@/components/campfire/CampfireUserAvatar';
import { useI18n, isolateBidiText } from '@/i18n';

import { MyDayPage } from '@/features/my-day/MyDayPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TeamReviewPage } from '@/features/team-review/TeamReviewPage';

import type { WorkspacePageDefinition, WorkspacePageID, WorkspaceShellProps } from './workspace-shell.types';

/**
 * workspacePages defines the flattened Campfire workspace information architecture.
 */
const workspacePages: readonly WorkspacePageDefinition[] = [
	{
		id: 'my-day',
		labelKey: 'workspace.nav.myDay.label',
		eyebrowKey: 'workspace.nav.myDay.eyebrow',
		titleKey: 'workspace.nav.myDay.title',
		descriptionKey: 'workspace.nav.myDay.description',
		managerOnly: false,
	},
	{
		id: 'team-review',
		labelKey: 'workspace.nav.teamReview.label',
		eyebrowKey: 'workspace.nav.teamReview.eyebrow',
		titleKey: 'workspace.nav.teamReview.title',
		descriptionKey: 'workspace.nav.teamReview.description',
		managerOnly: true,
	},
	{
		id: 'reports',
		labelKey: 'workspace.nav.reports.label',
		eyebrowKey: 'workspace.nav.reports.eyebrow',
		titleKey: 'workspace.nav.reports.title',
		descriptionKey: 'workspace.nav.reports.description',
		managerOnly: true,
	},
	{
		id: 'settings',
		labelKey: 'workspace.nav.settings.label',
		eyebrowKey: 'workspace.nav.settings.eyebrow',
		titleKey: 'workspace.nav.settings.title',
		descriptionKey: 'workspace.nav.settings.description',
		managerOnly: true,
	},
];

/**
 * CampfireWorkspaceShell renders the role-aware workspace application.
 */
export function CampfireWorkspaceShell(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const [activePage, setActivePage] = useState<WorkspacePageID>('my-day');

	const visiblePages = useMemo(() => {
		return workspacePages.filter(page => pageIsVisible(page, props));
	}, [props]);

	const activeDefinition = useMemo(() => {
		return resolveActivePage(activePage, visiblePages);
	}, [activePage, visiblePages]);

	return (
		<section className="campfire-workspace-shell">
			<WorkspaceSidebar activePage={activeDefinition.id} pages={visiblePages} {...props} onSelectPage={setActivePage} />

			<div className="campfire-workspace-main">
				<header className="campfire-workspace-topline">
					<div className="campfire-workspace-topline-copy">
						<span className="campfire-workspace-topline-eyebrow">{t(activeDefinition.eyebrowKey)}</span>
						<p className="campfire-workspace-topline-label">{t(activeDefinition.descriptionKey)}</p>
					</div>

					<div className="campfire-workspace-actions">
						<Button type="button" variant="secondary" size="sm" onClick={props.onRefresh}>
							<RefreshCw className="cf:size-4" />
							{t('common.refresh')}
						</Button>

						<Button type="button" variant="ghost" size="icon-sm" aria-label={t('workspace.action.close')} onClick={props.onClose}>
							<X className="cf:size-4" />
						</Button>
					</div>
				</header>

				<main className="campfire-workspace-content">
					<WorkspacePage activePage={activeDefinition.id} {...props} />
				</main>
			</div>
		</section>
	);
}

/**
 * WorkspaceSidebar renders persistent app navigation and identity context.
 */
function WorkspaceSidebar(
	props: WorkspaceShellProps & {
		readonly activePage: WorkspacePageID;
		readonly pages: readonly WorkspacePageDefinition[];
		readonly onSelectPage: (page: WorkspacePageID) => void;
	},
): ReactElement {
	const { t } = useI18n();

	return (
		<aside className="campfire-app-sidebar">
			<div className="campfire-sidebar-brand">
				<div className="campfire-sidebar-logo-tile">
					<img src={campfireLogoURL} alt="Campfire" className="campfire-sidebar-logo-image" />
					<span className="campfire-logo-embers campfire-sidebar-logo-embers" aria-hidden="true">
						<span className="campfire-logo-ember campfire-logo-ember--one" />
						<span className="campfire-logo-ember campfire-logo-ember--two" />
						<span className="campfire-logo-ember campfire-logo-ember--three" />
						<span className="campfire-logo-ember campfire-logo-ember--four" />
					</span>
				</div>
				<strong className="campfire-sidebar-brand-title">Campfire</strong>
			</div>

			<div className="campfire-sidebar-workspace">
				<span className="campfire-sidebar-workspace-name">{props.workspace.name}</span>
				<span className="campfire-sidebar-workspace-helper">
					{t('workspace.sidebar.workspaceTimezone', { timezone: isolateBidiText(props.workspace.timezone) })}
				</span>
			</div>

			<nav className="campfire-sidebar-nav" aria-label={t('workspace.nav.ariaLabel')}>
				{props.pages.map(page => {
					const active = page.id === props.activePage;
					const Icon = iconForPage(page.id);
					const description = t(page.descriptionKey);

					return (
						<button
							key={page.id}
							type="button"
							className={cn('campfire-sidebar-nav-item', active && 'campfire-sidebar-nav-item--active')}
							aria-current={active ? 'page' : undefined}
							title={description}
							onClick={() => props.onSelectPage(page.id)}
						>
							<Icon className="cf:size-5" />
							<span>{t(page.labelKey)}</span>
						</button>
					);
				})}
			</nav>

			<div className="campfire-sidebar-user">
				<CampfireUserAvatar
					userID={props.currentUser.id}
					displayName={props.currentUser.displayName}
					username={props.currentUser.username}
					className="campfire-sidebar-user-avatar"
				/>
				<span className="campfire-sidebar-user-copy">
					<span className="campfire-sidebar-user-name">{userDisplayName(props.currentUser.displayName, props.currentUser.username, t('workspace.user.fallback'))}</span>
					<span className="campfire-sidebar-user-role">{accessLabel(props, t)}</span>
				</span>
			</div>
		</aside>
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
function resolveActivePage(activePage: WorkspacePageID, visiblePages: readonly WorkspacePageDefinition[]): WorkspacePageDefinition {
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
			return SlidersHorizontal;
	}
}

/**
 * accessLabel returns the current user's readable workspace access label.
 */
function accessLabel(props: WorkspaceShellProps, t: ReturnType<typeof useI18n>['t']): string {
	if (props.isSystemAdmin) {
		return t('workspace.access.systemAdmin');
	}

	if (props.canManageWorkspace) {
		return t('workspace.access.workspaceLead');
	}

	if (props.capabilities.canApproveLeaves) {
		return t('workspace.access.approver');
	}

	if (props.capabilities.canViewWorkspaceReports) {
		return t('workspace.access.viewer');
	}

	return t('workspace.access.member');
}

/**
 * userDisplayName returns a safe current-user label.
 */
function userDisplayName(displayName: string, username: string, fallback: string): string {
	const cleanDisplayName = displayName.trim();
	if (cleanDisplayName !== '') {
		return cleanDisplayName;
	}

	const cleanUsername = username.trim();
	return cleanUsername === '' ? fallback : cleanUsername;
}
