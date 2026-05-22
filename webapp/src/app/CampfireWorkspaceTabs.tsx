import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { BarChart3, CalendarCheck, Clock3, Flame, Settings2, Sparkles, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
	readonly icon: LucideIcon;
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
		label: 'Tasks & Time',
		eyebrow: 'Effort tracking',
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
		<section className="campfire-workspace-shell">
			<WorkspacePageHeader
				definition={activeDefinition}
				workspace={props.workspace}
				canManageWorkspace={props.canManageWorkspace}
				isSystemAdmin={props.isSystemAdmin}
			/>

			<WorkspaceTabBar activeTab={activeDefinition.id} tabs={visibleTabs} onSelectTab={handleSelectTab} />

			<WorkspaceTabPanel activeTab={activeDefinition.id} {...props} />
		</section>
	);
}

/**
 * WorkspaceTabBar renders large readable workspace tabs.
 */
function WorkspaceTabBar(props: {
	readonly activeTab: CampfireWorkspaceTab;
	readonly tabs: readonly CampfireTabDefinition[];
	readonly onSelectTab: (tab: CampfireWorkspaceTab) => void;
}): ReactElement {
	return (
		<nav className="campfire-tab-grid" aria-label="Campfire workspace sections">
			{props.tabs.map(tab => {
				const isActive = tab.id === props.activeTab;
				const Icon = tab.icon;

				return (
					<button
						key={tab.id}
						type="button"
						aria-current={isActive ? 'page' : undefined}
						className={tabButtonClassName(isActive)}
						onClick={() => props.onSelectTab(tab.id)}
					>
						<span className={tabIconClassName(isActive)}>
							<Icon className="cf:size-7" />
						</span>

						<span className="campfire-tab-copy">
							<span className="campfire-tab-label">{tab.label}</span>
							<span className="campfire-tab-eyebrow">{tab.eyebrow}</span>
						</span>
					</button>
				);
			})}
		</nav>
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
	const Icon = props.definition.icon;

	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow={props.definition.eyebrow}
				title={props.definition.title}
				description={props.definition.description}
				icon={Icon}
				action={
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<CampfireStatusPill tone={props.canManageWorkspace ? 'green' : 'slate'}>
							{props.canManageWorkspace ? 'Lead access' : 'Member access'}
						</CampfireStatusPill>

						{props.isSystemAdmin && <CampfireStatusPill tone="ember">System admin</CampfireStatusPill>}
					</div>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric label="Workspace" value={props.workspace.name} helper="Current channel" />
				<CampfireMetric label="Timezone" value={props.workspace.timezone} helper="Schedule basis" />
				<BoardMetric boardUrl={props.workspace.boardUrl} />
				<CampfireMetric
					label="Access"
					value={accessLabel(props.canManageWorkspace, props.isSystemAdmin)}
					helper="Current user"
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
					<div className="campfire-restricted-state-icon">
						<Sparkles className="cf:size-7" />
					</div>
					<h3 className="cf:m-0 cf:text-2xl cf:font-black cf:text-white">Settings are restricted</h3>
					<p className="cf:m-0 cf:text-base cf:font-semibold cf:leading-7 cf:text-muted-foreground">
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
 * BoardMetric renders the workspace board URL as a real clickable link.
 */
function BoardMetric(props: { readonly boardUrl: string }): ReactElement {
	const normalizedURL = normalizeExternalURL(props.boardUrl);

	if (normalizedURL === '') {
		return <CampfireMetric label="Board" value="Not set" helper="Optional external link" />;
	}

	return (
		<a
			className="campfire-metric campfire-metric-link"
			href={normalizedURL}
			target="_blank"
			rel="noreferrer"
			title={normalizedURL}
		>
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="campfire-metric-label">Board</p>
					<p className="campfire-metric-value">{boardLabel(props.boardUrl)}</p>
				</div>
			</div>
			<p className="campfire-metric-helper">Open external link</p>
		</a>
	);
}

/**
 * normalizeExternalURL adds a safe protocol when users enter a bare domain.
 */
function normalizeExternalURL(value: string): string {
	const cleanValue = value.trim();

	if (cleanValue === '') {
		return '';
	}

	if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
		return cleanValue;
	}

	return `https://${cleanValue}`;
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
 * tabButtonClassName returns workspace tab button classes.
 */
function tabButtonClassName(active: boolean): string {
	return cn('campfire-tab-button', active && 'campfire-tab-button--active');
}

/**
 * tabIconClassName returns workspace tab icon container classes.
 */
function tabIconClassName(active: boolean): string {
	return cn('campfire-tab-icon', active && 'campfire-tab-icon--active');
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
