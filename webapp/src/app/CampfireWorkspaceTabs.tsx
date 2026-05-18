import { useMemo, useState, type ReactElement } from 'react';

import { ApprovedLeavesCard } from './ApprovedLeavesCard';
import { CSVExportsCard } from './CSVExportsCard';
import { DailyReportPreviewCard } from './DailyReportPreviewCard';
import { GlobalOffDaysCard } from './GlobalOffDaysCard';
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
import { WorkspaceWorkingDaysCard } from './WorkspaceWorkingDaysCard';
import type { Workspace } from '../types/domain';
import { GlobalReportsCard } from './GlobalReportsCard';

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
 * CampfireTabDefinition describes one workspace navigation tab.
 */
type CampfireTabDefinition = {
	readonly id: CampfireWorkspaceTab;
	readonly label: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
};

const tabs: readonly CampfireTabDefinition[] = [
	{
		id: 'today',
		label: 'Today',
		eyebrow: 'Daily hub',
		title: 'Today around the fire',
		description: 'Submit standups, track task time, and see availability for the current workspace.',
	},
	{
		id: 'standups',
		label: 'Standups',
		eyebrow: 'Async rhythm',
		title: 'Standups and submissions',
		description: 'Review submissions, runtime decisions, templates, and the current standup configuration.',
	},
	{
		id: 'time',
		label: 'Time',
		eyebrow: 'Tasks and effort',
		title: 'Tasks and time',
		description: 'Create tasks, log time for any date, and summarize time by person, task, project, or week.',
	},
	{
		id: 'leaves',
		label: 'Leaves',
		eyebrow: 'Availability',
		title: 'Leaves and approvals',
		description: 'Request leave, review approvals, and see who is out without counting them as missing.',
	},
	{
		id: 'reports',
		label: 'Reports',
		eyebrow: 'Markdown and CSV',
		title: 'Reports and exports',
		description: 'Preview Markdown reports, post to the channel, save filters, and export CSV files.',
	},
	{
		id: 'settings',
		label: 'Settings',
		eyebrow: 'Workspace controls',
		title: 'Workspace settings',
		description: 'Manage working days, off-days, reminders, global holidays, forms, and schedules.',
	},
];

/**
 * CampfireWorkspaceTabs renders the main workspace app shell.
 */
export function CampfireWorkspaceTabs(props: CampfireWorkspaceTabsProps): ReactElement {
	const [activeTab, setActiveTab] = useState<CampfireWorkspaceTab>('today');

	const activeDefinition = useMemo(() => tabs.find(tab => tab.id === activeTab) ?? tabs[0], [activeTab]);

	return (
		<section className="cf:mt-5 cf:grid cf:gap-5 cf:lg:grid-cols-[16rem_1fr]">
			<aside className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-3 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
				<div className="cf:p-3">
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
						Workspace
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:truncate cf:text-xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						{props.workspace.name}
					</h2>
					<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
						{props.workspace.timezone}
					</p>
				</div>

				<nav className="cf:mt-2 cf:grid cf:gap-2" aria-label="Campfire workspace sections">
					{tabs.map(tab => (
						<button
							key={tab.id}
							className={tabButtonClassName(tab.id === activeTab)}
							type="button"
							onClick={() => setActiveTab(tab.id)}
						>
							<span className="cf:block cf:text-left cf:text-sm cf:font-black">{tab.label}</span>
							<span className="cf:mt-0.5 cf:block cf:text-left cf:text-xs cf:font-bold cf:opacity-75">
								{tab.eyebrow}
							</span>
						</button>
					))}
				</nav>
			</aside>

			<div className="cf:min-w-0">
				<header className="cf:rounded-3xl cf:border cf:border-orange-400/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
						{activeDefinition!.eyebrow}
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-3xl cf:font-black cf:tracking-[-0.05em] cf:text-white">
						{activeDefinition!.title}
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						{activeDefinition!.description}
					</p>
				</header>

				<div className="cf:mt-5 cf:grid cf:gap-5">{renderActiveTab(props, activeTab)}</div>
			</div>
		</section>
	);
}

/**
 * renderActiveTab returns the cards for one active workspace tab.
 */
function renderActiveTab(props: CampfireWorkspaceTabsProps, activeTab: CampfireWorkspaceTab): ReactElement {
	switch (activeTab) {
		case 'today':
			return (
				<>
					<WhoIsOutCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
					<StandupSubmissionCard workspace={props.workspace} onStandupSubmitted={props.onStandupSubmitted} />
					<TasksAndTimeCard workspace={props.workspace} />
					<MyPendingLeavesCard
						workspace={props.workspace}
						refreshToken={props.leaveRefreshToken}
						onLeaveCancelled={props.onLeaveCancelled}
					/>
				</>
			);

		case 'standups':
			return (
				<>
					<StandupSubmissionsCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
					<StandupRuntimeCard
						workspace={props.workspace}
						refreshToken={props.leaveRefreshToken + props.workspaceCalendarRefreshToken}
					/>
					<StandupConfigurationCard workspace={props.workspace} />
				</>
			);

		case 'time':
			return (
				<>
					<TasksAndTimeCard workspace={props.workspace} />
					<TimeReportSummaryCard workspace={props.workspace} />
				</>
			);

		case 'leaves':
			return (
				<>
					<WhoIsOutCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
					<LeaveRequestCard workspace={props.workspace} onLeaveCreated={props.onLeaveCreated} />
					<LeaveApprovalsCard
						workspace={props.workspace}
						refreshToken={props.leaveRefreshToken}
						onLeaveDecided={props.onLeaveDecided}
					/>
					<MyPendingLeavesCard
						workspace={props.workspace}
						refreshToken={props.leaveRefreshToken}
						onLeaveCancelled={props.onLeaveCancelled}
					/>
					<ApprovedLeavesCard workspace={props.workspace} refreshToken={props.leaveRefreshToken} />
				</>
			);

		case 'reports':
			return (
				<>
					<GlobalReportsCard isSystemAdmin={props.isSystemAdmin} />
					<ReportSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />
					<SavedReportFiltersCard workspace={props.workspace} />
					<CSVExportsCard workspace={props.workspace} />
					<TimeReportSummaryCard workspace={props.workspace} />
					<DailyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
					<WeeklyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />
				</>
			);

		case 'settings':
			return (
				<>
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
					<ReminderSettingsCard workspace={props.workspace} canManageWorkspace={props.canManageWorkspace} />
					<GlobalOffDaysCard isSystemAdmin={props.isSystemAdmin} />
					<StandupFormBuilderCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						onConfigurationChanged={props.onStandupConfigurationChanged}
					/>
					<StandupScheduleBuilderCard
						workspace={props.workspace}
						canManageWorkspace={props.canManageWorkspace}
						onConfigurationChanged={props.onStandupConfigurationChanged}
					/>
				</>
			);
	}
}

/**
 * tabButtonClassName returns the visual style for a workspace tab button.
 */
function tabButtonClassName(isActive: boolean): string {
	const baseClassName =
		'cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:transition cf:focus:outline-none cf:focus:ring-4 cf:focus:ring-orange-400/20';

	if (isActive) {
		return `${baseClassName} cf:border-orange-300/35 cf:bg-orange-400/20 cf:text-orange-50 cf:shadow-[0_16px_40px_rgba(249,115,22,0.12)]`;
	}

	return `${baseClassName} cf:border-white/10 cf:bg-white/[0.04] cf:text-slate-300 cf:hover:bg-white/[0.08] cf:hover:text-white`;
}
