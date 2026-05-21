import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BarChart3, CalendarCheck, Clock3, Flame, Settings2, UsersRound } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Workspace } from '@/types/domain';

import { ApprovedLeavesCard } from './ApprovedLeavesCard';
import { CampfireCardBody, CampfireCardHeader, CampfireMetric, CampfirePanel, CampfireStatusPill } from './campfire-ui';
import { CSVExportsCard } from './CSVExportsCard';
import { DailyReportPreviewCard } from './DailyReportPreviewCard';
import { GlobalLeaveReportsCard } from './GlobalLeaveReportsCard';
import { GlobalOffDaysCard } from './GlobalOffDaysCard';
import { GlobalReportsCard } from './GlobalReportsCard';
import { LeaveApprovalsCard } from './LeaveApprovalsCard';
import { LeaveRequestCard } from './LeaveRequestCard';
import { MyPendingLeavesCard } from './MyPendingLeavesCard';
import { ReminderSettingsCard } from './ReminderSettingsCard';
import { ReportSettingsCard } from './ReportSettingsCard';
import { SavedReportFiltersCard } from './SavedReportFiltersCard';
import { StandupConfigurationCard } from './StandupConfigurationCard';
import { StandupFormBuilderCard } from './StandupFormBuilderCard';
import { StandupRuntimeCard } from './StandupRuntimeCard';
import { StandupScheduleBuilderCard } from './StandupScheduleBuilderCard';
import { StandupSubmissionCard } from './StandupSubmissionCard';
import { StandupSubmissionsCard } from './StandupSubmissionsCard';
import { TasksAndTimeCard } from './TasksAndTimeCard';
import { TimeReportSummaryCard } from './TimeReportSummaryCard';
import { WeeklyReportPreviewCard } from './WeeklyReportPreviewCard';
import { WhoIsOutCard } from './WhoIsOutCard';
import { WorkspaceOffDaysCard } from './WorkspaceOffDaysCard';
import { WorkspaceRolesCard } from './WorkspaceRolesCard';
import { WorkspaceWorkingDaysCard } from './WorkspaceWorkingDaysCard';
import { AuditLogCard } from './AuditLogCard';

/**
 * CampfireWorkspaceTab identifies one main workspace section.
 */
type CampfireWorkspaceTab = 'today' | 'standups' | 'time' | 'leaves' | 'reports' | 'settings';

/**
 * CampfireWorkspaceTabsProps contains workspace data and refresh callbacks.
 */
type CampfireWorkspaceTabsProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly isSystemAdmin: boolean;
	readonly leaveRefreshToken: number;
	readonly standupRefreshToken: number;
	readonly workspaceCalendarRefreshToken: number;
	readonly onLeaveCreated: () => void;
	readonly onLeaveDecided: () => void;
	readonly onLeaveCancelled: () => void;
	readonly onStandupSubmitted: () => void;
	readonly onStandupConfigurationChanged: () => void;
	readonly onWorkspaceCalendarChanged: () => void;
};

/**
 * CampfireTabDefinition describes one workspace navigation item.
 */
type CampfireTabDefinition = {
	readonly id: CampfireWorkspaceTab;
	readonly label: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly icon: typeof Flame;
	readonly requiresManager: boolean;
};

/**
 * TabPanelProps contains all data needed to render a tab panel.
 */
type TabPanelProps = CampfireWorkspaceTabsProps;

/**
 * tabDefinitions defines the main Campfire workspace navigation.
 */
const tabDefinitions: readonly CampfireTabDefinition[] = [
	{
		id: 'today',
		label: 'Today',
		eyebrow: 'Daily hub',
		title: 'Today around the fire',
		description: 'Submit standups, track task time, and see availability for the current workspace.',
		icon: Flame,
		requiresManager: false,
	},
	{
		id: 'standups',
		label: 'Standups',
		eyebrow: 'Async rhythm',
		title: 'Standups and submissions',
		description: 'Review submissions, runtime decisions, templates, schedules, and form configuration.',
		icon: UsersRound,
		requiresManager: false,
	},
	{
		id: 'time',
		label: 'Time',
		eyebrow: 'Tasks and effort',
		title: 'Tasks and time',
		description: 'Create tasks, log time for any date, and summarize effort by person, task, project, or week.',
		icon: Clock3,
		requiresManager: false,
	},
	{
		id: 'leaves',
		label: 'Leaves',
		eyebrow: 'Availability',
		title: 'Leaves and approvals',
		description: 'Request leave, review approvals, and see who is out without counting them as missing.',
		icon: CalendarCheck,
		requiresManager: false,
	},
	{
		id: 'reports',
		label: 'Reports',
		eyebrow: 'Markdown and CSV',
		title: 'Reports and exports',
		description: 'Preview Markdown reports, post to the channel, save filters, and export CSV files.',
		icon: BarChart3,
		requiresManager: false,
	},
	{
		id: 'settings',
		label: 'Settings',
		eyebrow: 'Workspace controls',
		title: 'Workspace settings',
		description:
			'Manage roles, working days, off-days, reminders, global holidays, forms, schedules, and audit logs.',
		icon: Settings2,
		requiresManager: true,
	},
];

/**
 * CampfireWorkspaceTabs renders the main workspace command center.
 */
export function CampfireWorkspaceTabs(props: CampfireWorkspaceTabsProps): ReactElement {
	const [activeTab, setActiveTab] = useState<CampfireWorkspaceTab>('today');

	const visibleTabs = useMemo(() => {
		return tabDefinitions.filter(tab => !tab.requiresManager || props.canManageWorkspace || props.isSystemAdmin);
	}, [props.canManageWorkspace, props.isSystemAdmin]);

	const activeDefinition = useMemo<CampfireTabDefinition>(() => {
		const matchingTab = visibleTabs.find(tab => tab.id === activeTab);

		if (matchingTab !== undefined) {
			return matchingTab;
		}

		return getDefaultTabDefinition();
	}, [activeTab, visibleTabs]);

	function handleSelectTab(tab: CampfireWorkspaceTab): void {
		setActiveTab(tab);
	}

	return (
		<section className="cf:grid cf:gap-5 cf:lg:grid-cols-12">
			<WorkspaceSidebar
				workspace={props.workspace}
				activeTab={activeDefinition.id}
				tabs={visibleTabs}
				canManageWorkspace={props.canManageWorkspace}
				isSystemAdmin={props.isSystemAdmin}
				onSelectTab={handleSelectTab}
			/>

			<div className="cf:grid cf:gap-5 cf:lg:col-span-9">
				<WorkspacePageHeader
					definition={activeDefinition}
					workspace={props.workspace}
					canManageWorkspace={props.canManageWorkspace}
					isSystemAdmin={props.isSystemAdmin}
				/>

				<WorkspaceTabPanel activeTab={activeDefinition.id} {...props} />
			</div>
		</section>
	);
}

/**
 * WorkspaceSidebar renders workspace identity and tab navigation.
 */
function WorkspaceSidebar(props: {
	readonly workspace: Workspace;
	readonly activeTab: CampfireWorkspaceTab;
	readonly tabs: readonly CampfireTabDefinition[];
	readonly canManageWorkspace: boolean;
	readonly isSystemAdmin: boolean;
	readonly onSelectTab: (tab: CampfireWorkspaceTab) => void;
}): ReactElement {
	return (
		<aside className="cf:lg:col-span-3">
			<div className="cf:sticky cf:top-4 cf:grid cf:gap-4">
				<CampfirePanel>
					<CampfireCardBody className="cf:grid cf:gap-4">
						<div>
							<p className="cf:m-0 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
								Workspace
							</p>
							<h2 className="cf:m-0 cf:mt-2 cf:truncate cf:text-xl cf:font-black cf:tracking-tight cf:text-white">
								{props.workspace.name}
							</h2>
							<p className="cf:m-0 cf:mt-1 cf:truncate cf:text-xs cf:font-bold cf:text-slate-400">
								{props.workspace.timezone}
							</p>
						</div>

						<div className="cf:grid cf:gap-2">
							<CampfireMetric
								label="Channel"
								value={shortID(props.workspace.channelId)}
								helper="Mattermost workspace"
							/>
							<CampfireMetric
								label="Access"
								value={accessLabel(props.canManageWorkspace, props.isSystemAdmin)}
								helper="Current user"
							/>
						</div>
					</CampfireCardBody>
				</CampfirePanel>

				<nav className="cf:grid cf:gap-2" aria-label="Campfire workspace sections">
					{props.tabs.map(tab => (
						<button
							key={tab.id}
							type="button"
							className={tabButtonClassName(tab.id === props.activeTab)}
							onClick={() => props.onSelectTab(tab.id)}
						>
							<span className="cf:flex cf:items-center cf:gap-3">
								<span className={tabIconClassName(tab.id === props.activeTab)}>
									<tab.icon className="cf:size-4" />
								</span>

								<span className="cf:min-w-0">
									<span className="cf:block cf:text-left cf:text-sm cf:font-black">{tab.label}</span>
									<span className="cf:mt-0.5 cf:block cf:truncate cf:text-left cf:text-xs cf:font-bold cf:opacity-75">
										{tab.eyebrow}
									</span>
								</span>
							</span>
						</button>
					))}
				</nav>
			</div>
		</aside>
	);
}

/**
 * WorkspacePageHeader renders the current tab title and quick facts.
 */
function WorkspacePageHeader(props: {
	readonly definition: CampfireTabDefinition;
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly isSystemAdmin: boolean;
}): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow={props.definition.eyebrow}
				title={props.definition.title}
				description={props.definition.description}
				icon={props.definition.icon}
				action={
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<CampfireStatusPill tone={props.canManageWorkspace ? 'green' : 'slate'}>
							{props.canManageWorkspace ? 'Lead access' : 'Member access'}
						</CampfireStatusPill>

						{props.isSystemAdmin && <CampfireStatusPill tone="ember">System admin</CampfireStatusPill>}
					</div>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-3 cf:md:grid-cols-3">
				<CampfireMetric label="Workspace" value={props.workspace.name} helper="Current channel" />
				<CampfireMetric label="Timezone" value={props.workspace.timezone} helper="Schedule basis" />
				<CampfireMetric
					label="Board"
					value={boardLabel(props.workspace.boardUrl)}
					helper="Optional external link"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * WorkspaceTabPanel renders the selected workspace section.
 */
function WorkspaceTabPanel(props: TabPanelProps & { readonly activeTab: CampfireWorkspaceTab }): ReactElement {
	switch (props.activeTab) {
		case 'today':
			return <TodayTab {...props} />;

		case 'standups':
			return <StandupsTab {...props} />;

		case 'time':
			return <TimeTab {...props} />;

		case 'leaves':
			return <LeavesTab {...props} />;

		case 'reports':
			return <ReportsTab {...props} />;

		case 'settings':
			return <SettingsTab {...props} />;
	}
}

/**
 * TodayTab renders the personal daily hub.
 */
function TodayTab(props: TabPanelProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-5">
			<WhoIsOutCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<StandupSubmissionCard workspace={props.workspace} onStandupSubmitted={props.onStandupSubmitted} />
				<MyPendingLeavesCard
					workspace={props.workspace}
					refreshToken={props.leaveRefreshToken}
					onLeaveCancelled={props.onLeaveCancelled}
				/>
			</div>

			<TasksAndTimeCard workspace={props.workspace} />
		</div>
	);
}

/**
 * StandupsTab renders standup review and configuration cards.
 */
function StandupsTab(props: TabPanelProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-5">
			<StandupSubmissionsCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
			<StandupRuntimeCard workspace={props.workspace} refreshToken={props.workspaceCalendarRefreshToken} />

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<StandupConfigurationCard workspace={props.workspace} />
				<StandupScheduleBuilderCard
					workspace={props.workspace}
					canManageWorkspace={props.canManageWorkspace}
					onConfigurationChanged={props.onStandupConfigurationChanged}
				/>
			</div>

			<StandupFormBuilderCard
				workspace={props.workspace}
				canManageWorkspace={props.canManageWorkspace}
				onConfigurationChanged={props.onStandupConfigurationChanged}
			/>
		</div>
	);
}

/**
 * TimeTab renders task and time tracking cards.
 */
function TimeTab(props: TabPanelProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-5">
			<TasksAndTimeCard workspace={props.workspace} />
			<TimeReportSummaryCard workspace={props.workspace} />
		</div>
	);
}

/**
 * LeavesTab renders leave request, availability, and approval cards.
 */
function LeavesTab(props: TabPanelProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-5">
			<WhoIsOutCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<LeaveRequestCard workspace={props.workspace} onLeaveCreated={props.onLeaveCreated} />
				<MyPendingLeavesCard
					workspace={props.workspace}
					refreshToken={props.leaveRefreshToken}
					onLeaveCancelled={props.onLeaveCancelled}
				/>
			</div>

			<LeaveApprovalsCard
				workspace={props.workspace}
				refreshToken={props.leaveRefreshToken}
				onLeaveDecided={props.onLeaveDecided}
			/>

			<ApprovedLeavesCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
		</div>
	);
}

/**
 * ReportsTab renders report previews, saved filters, exports, and global dashboards.
 */
function ReportsTab(props: TabPanelProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-5">
			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<DailyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
				<WeeklyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
			</div>

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<TimeReportSummaryCard workspace={props.workspace} />
				<CSVExportsCard workspace={props.workspace} />
			</div>

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<SavedReportFiltersCard workspace={props.workspace} />
				<ReportSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />
			</div>

			{props.isSystemAdmin && (
				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<GlobalReportsCard isSystemAdmin={props.isSystemAdmin} />
					<GlobalLeaveReportsCard isSystemAdmin={props.isSystemAdmin} />
				</div>
			)}
		</div>
	);
}

/**
 * SettingsTab renders management cards.
 */
function SettingsTab(props: TabPanelProps): ReactElement {
	if (!props.canManageWorkspace && !props.isSystemAdmin) {
		return (
			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-4">
					<h3 className="cf:text-xl cf:font-black cf:text-white">Settings are restricted</h3>
					<p className="cf:m-0 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
						Only workspace Leads and system admins can manage workspace settings.
					</p>
				</CampfireCardBody>
			</CampfirePanel>
		);
	}

	return (
		<div className="cf:grid cf:gap-5">
			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<WorkspaceRolesCard workspace={props.workspace} isSystemAdmin={props.isSystemAdmin} />
				<AuditLogCard workspace={props.workspace} />
			</div>

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<WorkspaceWorkingDaysCard
					workspace={props.workspace}
					canManageWorkspace={props.canManageWorkspace}
					refreshToken={props.workspaceCalendarRefreshToken}
					onWorkingDaysChanged={props.onWorkspaceCalendarChanged}
				/>

				<WorkspaceOffDaysCard
					workspace={props.workspace}
					canManageWorkspace={props.canManageWorkspace}
					refreshToken={props.workspaceCalendarRefreshToken}
					onOffDaysChanged={props.onWorkspaceCalendarChanged}
				/>
			</div>

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<ReminderSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />
				<ReportSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />
			</div>

			<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
				<StandupScheduleBuilderCard
					workspace={props.workspace}
					canManageWorkspace={props.canManageWorkspace}
					onConfigurationChanged={props.onStandupConfigurationChanged}
				/>
				<GlobalOffDaysCard isSystemAdmin={props.isSystemAdmin} />
			</div>

			<StandupFormBuilderCard
				workspace={props.workspace}
				canManageWorkspace={props.canManageWorkspace}
				onConfigurationChanged={props.onStandupConfigurationChanged}
			/>
		</div>
	);
}

/**
 * getDefaultTabDefinition returns the Today tab definition without relying on array indexing.
 */
function getDefaultTabDefinition(): CampfireTabDefinition {
	const todayTab = tabDefinitions.find(tab => tab.id === 'today');

	if (todayTab === undefined) {
		throw new Error('Campfire Today tab definition is missing.');
	}

	return todayTab;
}

/**
 * tabButtonClassName returns sidebar tab button classes.
 */
function tabButtonClassName(active: boolean): string {
	return cn(
		'cf:w-full cf:rounded-2xl cf:border cf:p-3 cf:text-left cf:transition cf:disabled:cursor-not-allowed cf:disabled:opacity-60',
		active
			? 'cf:border-orange-300/35 cf:bg-orange-400/15 cf:text-orange-50 cf:shadow-lg'
			: 'cf:border-white/10 cf:bg-white/5 cf:text-slate-300 cf:hover:bg-white/10 cf:hover:text-white',
	);
}

/**
 * tabIconClassName returns sidebar tab icon container classes.
 */
function tabIconClassName(active: boolean): string {
	return cn(
		'cf:grid cf:size-9 cf:shrink-0 cf:place-items-center cf:rounded-xl',
		active ? 'cf:bg-orange-300/15 cf:text-orange-100' : 'cf:bg-slate-900 cf:text-slate-400',
	);
}

/**
 * accessLabel returns a readable role label for the current user.
 */
function accessLabel(canManageWorkspace: boolean, isSystemAdmin: boolean): string {
	if (isSystemAdmin) {
		return 'Admin';
	}

	if (canManageWorkspace) {
		return 'Lead';
	}

	return 'Member';
}

/**
 * boardLabel returns a compact board URL display value.
 */
function boardLabel(boardUrl: string): string {
	if (boardUrl.trim() === '') {
		return 'Not set';
	}

	try {
		return new URL(boardUrl).hostname;
	} catch (_error: unknown) {
		return 'Linked';
	}
}

/**
 * shortID returns a compact ID display value.
 */
function shortID(value: string): string {
	if (value.length <= 10) {
		return value;
	}

	return value.slice(0, 10);
}
