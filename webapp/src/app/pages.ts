import { BarChart3, Flame, SlidersHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import type { TranslationKey } from '@/shared/i18n';
import type { Area, PageId } from '@/shared/navigation';

import { MyLeavePage, MyTasksPage, StandupPage, TimeLogPage } from '@/features/my-day';
import { CsvExportsPage, DailyReportPage, GlobalReportsPage, SavedFiltersPage, TimeReportPage, WeeklyReportPage } from '@/features/reports';
import {
	AuditLogPage,
	DataManagementPage,
	GlobalOffDaysPage,
	OverviewPage,
	RemindersPage,
	ReportRulesPage,
	RolesPage,
	StandupFormsPage,
	WorkingCalendarPage,
} from '@/features/settings';
import { ApprovalsPage, AvailabilityPage, RuntimePage, TeamStandupsPage } from '@/features/team-review';

import { isManager } from './access';
import type { Access } from './access';

/**
 * PageDefinition registers one page: where it lives, what it is called, who may open it.
 */
export type PageDefinition = {
	readonly id: PageId;
	readonly area: Area;
	readonly labelKey: TranslationKey;
	readonly component: ComponentType;
	readonly isVisible: (access: Access) => boolean;
};

/**
 * AreaDefinition describes a sidebar group.
 */
export type AreaDefinition = {
	readonly id: Area;
	readonly labelKey: TranslationKey;
	readonly icon: LucideIcon;
};

export const AREAS: readonly AreaDefinition[] = [
	{ id: 'my-day', labelKey: 'workspace.nav.myDay.label', icon: Flame },
	{ id: 'team', labelKey: 'workspace.nav.teamReview.label', icon: Users },
	{ id: 'reports', labelKey: 'workspace.nav.reports.label', icon: BarChart3 },
	{ id: 'settings', labelKey: 'workspace.nav.settings.label', icon: SlidersHorizontal },
];

const everyone = (): boolean => true;
const managers = (access: Access): boolean => isManager(access);
const approvers = (access: Access): boolean => isManager(access) || access.capabilities.canApproveLeaves;
const workspaceReports = (access: Access): boolean => isManager(access) || access.capabilities.canViewWorkspaceReports;
const globalReports = (access: Access): boolean => access.isSystemAdmin || access.capabilities.canViewGlobalReports;
const systemAdmins = (access: Access): boolean => access.isSystemAdmin;

/**
 * PAGES is the single source of truth for navigation, permissions and routing.
 * Order here is the order in the sidebar.
 */
export const PAGES: readonly PageDefinition[] = [
	{ id: 'my-day.standup', area: 'my-day', labelKey: 'myDay.tabs.standup.label', component: StandupPage, isVisible: everyone },
	{ id: 'my-day.tasks', area: 'my-day', labelKey: 'myDay.tabs.tasks.label', component: MyTasksPage, isVisible: everyone },
	{ id: 'my-day.time', area: 'my-day', labelKey: 'myDay.tabs.time.label', component: TimeLogPage, isVisible: everyone },
	{ id: 'my-day.leave', area: 'my-day', labelKey: 'myDay.tabs.leave.label', component: MyLeavePage, isVisible: everyone },

	{ id: 'team.standups', area: 'team', labelKey: 'teamReview.sections.standups.label', component: TeamStandupsPage, isVisible: managers },
	{
		id: 'team.availability',
		area: 'team',
		labelKey: 'teamReview.sections.availability.label',
		component: AvailabilityPage,
		isVisible: managers,
	},
	{ id: 'team.approvals', area: 'team', labelKey: 'teamReview.sections.approvals.label', component: ApprovalsPage, isVisible: approvers },
	{ id: 'team.runtime', area: 'team', labelKey: 'teamReview.sections.runtime.label', component: RuntimePage, isVisible: managers },

	{
		id: 'reports.daily',
		area: 'reports',
		labelKey: 'reports.sections.daily.label',
		component: DailyReportPage,
		isVisible: workspaceReports,
	},
	{
		id: 'reports.weekly',
		area: 'reports',
		labelKey: 'reports.sections.weekly.label',
		component: WeeklyReportPage,
		isVisible: workspaceReports,
	},
	{ id: 'reports.time', area: 'reports', labelKey: 'reports.sections.time.label', component: TimeReportPage, isVisible: workspaceReports },
	{
		id: 'reports.csv',
		area: 'reports',
		labelKey: 'reports.sections.exports.label',
		component: CsvExportsPage,
		isVisible: workspaceReports,
	},
	{
		id: 'reports.saved',
		area: 'reports',
		labelKey: 'reports.sections.saved.label',
		component: SavedFiltersPage,
		isVisible: workspaceReports,
	},
	{
		id: 'reports.global',
		area: 'reports',
		labelKey: 'reports.sections.global.label',
		component: GlobalReportsPage,
		isVisible: globalReports,
	},

	{ id: 'settings.overview', area: 'settings', labelKey: 'settings.sections.overview.label', component: OverviewPage, isVisible: managers },
	{ id: 'settings.roles', area: 'settings', labelKey: 'settings.sections.roles.label', component: RolesPage, isVisible: managers },
	{
		id: 'settings.calendar',
		area: 'settings',
		labelKey: 'settings.sections.calendar.label',
		component: WorkingCalendarPage,
		isVisible: managers,
	},
	{
		id: 'settings.standup-forms',
		area: 'settings',
		labelKey: 'settings.sections.standups.label',
		component: StandupFormsPage,
		isVisible: managers,
	},
	{
		id: 'settings.reminders',
		area: 'settings',
		labelKey: 'settings.sections.reminders.label',
		component: RemindersPage,
		isVisible: managers,
	},
	{
		id: 'settings.report-rules',
		area: 'settings',
		labelKey: 'settings.sections.reports.label',
		component: ReportRulesPage,
		isVisible: managers,
	},
	{ id: 'settings.audit', area: 'settings', labelKey: 'settings.sections.audit.label', component: AuditLogPage, isVisible: managers },
	{ id: 'settings.data', area: 'settings', labelKey: 'settings.sections.data.label', component: DataManagementPage, isVisible: managers },
	{
		id: 'settings.global-off-days',
		area: 'settings',
		labelKey: 'settings.sections.global.label',
		component: GlobalOffDaysPage,
		isVisible: systemAdmins,
	},
];

/**
 * visiblePages returns the pages a user may open.
 */
export function visiblePages(access: Access): readonly PageDefinition[] {
	return PAGES.filter(page => page.isVisible(access));
}

/**
 * resolvePage returns the requested page when it is allowed, otherwise the first visible page.
 */
export function resolvePage(pageID: PageId, pages: readonly PageDefinition[]): PageDefinition {
	return pages.find(page => page.id === pageID) ?? pages[0] ?? (PAGES[0] as PageDefinition);
}
