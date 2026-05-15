/**
 * Role represents Campfire's simple role model.
 */
export type Role = 'member' | 'lead' | 'approver' | 'admin' | 'viewer';

/**
 * QuestionType identifies the supported dynamic standup question type.
 */
export type QuestionType =
	| 'text'
	| 'long_text'
	| 'checkbox'
	| 'boolean'
	| 'dropdown'
	| 'multi_select'
	| 'number'
	| 'duration';

/**
 * StandupKind identifies a standup template or schedule kind.
 */
export type StandupKind = 'daily' | 'weekly' | 'custom';

/**
 * WeeklyMode identifies how weekly summaries are scheduled.
 */
export type WeeklyMode = 'last_working_day';

/**
 * TaskStatus identifies the lifecycle state of a task.
 */
export type TaskStatus = 'active' | 'completed' | 'blocked' | 'dropped' | 'archived';

/**
 * LeaveDurationMode describes how much time a leave request covers.
 */
export type LeaveDurationMode = 'full_day' | 'half_day' | 'hourly';

/**
 * LeaveHalfDayPart identifies which half of a day is covered.
 */
export type LeaveHalfDayPart = 'morning' | 'afternoon';

/**
 * LeaveStatus identifies the approval state of a leave request.
 */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * ReportKind identifies the type of report Campfire can generate.
 */
export type ReportKind = 'daily' | 'weekly' | 'blockers' | 'missing' | 'time';

/**
 * ReportSortMode identifies supported report sorting modes.
 */
export type ReportSortMode = 'name' | 'first_submitted' | 'last_submitted' | 'missing_first' | 'blockers_first';

/**
 * LocalDate is a YYYY-MM-DD date string interpreted in a workspace timezone.
 */
export type LocalDate = string;

/**
 * TimeOfDay is an HH:mm local workspace time string.
 */
export type TimeOfDay = string;

/**
 * Workspace represents Campfire configuration for a Mattermost channel.
 */
export type Workspace = {
	readonly id: string;
	readonly teamId: string;
	readonly channelId: string;
	readonly name: string;
	readonly description: string;
	readonly boardUrl: string;
	readonly timezone: string;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly isArchived: boolean;
};

/**
 * WorkspaceCapabilities describes actions the current user can perform.
 */
export type WorkspaceCapabilities = {
	readonly canSubmitStandup: boolean;
	readonly canManageWorkspace: boolean;
	readonly canManageStandups: boolean;
	readonly canViewWorkspaceReports: boolean;
	readonly canApproveLeaves: boolean;
	readonly canViewGlobalReports: boolean;
	readonly canExportReports: boolean;
};

/**
 * WorkspaceWorkingDay describes an enabled or disabled weekday.
 *
 * Weekday uses Go/Mattermost backend numbering:
 * 0 Sunday through 6 Saturday.
 */
export type WorkspaceWorkingDay = {
	readonly id: string;
	readonly workspaceId: string;
	readonly weekday: number;
	readonly enabled: boolean;
};

/**
 * WorkspaceSkipDate describes a workspace-level holiday or no-standup day.
 */
export type WorkspaceSkipDate = {
	readonly id: string;
	readonly workspaceId: string;
	readonly date: LocalDate;
	readonly label: string;
	readonly createdBy: string;
	readonly createdAt: string;
};

/**
 * GlobalSkipDate describes a global Campfire off-day across all workspaces.
 */
export type GlobalSkipDate = {
	readonly id: string;
	readonly date: LocalDate;
	readonly label: string;
	readonly createdBy: string;
	readonly createdAt: string;
};

/**
 * LeaveType defines a workspace-level leave type.
 */
export type LeaveType = {
	readonly id: string;
	readonly workspaceId: string;
	readonly name: string;
	readonly code: string;
	readonly color: string;
	readonly requiresApproval: boolean;
	readonly isActive: boolean;
};

/**
 * LeaveRequest represents one user leave request.
 */
export type LeaveRequest = {
	readonly id: string;
	readonly workspaceId: string;
	readonly userId: string;
	readonly leaveTypeId: string;
	readonly startDate: LocalDate;
	readonly endDate: LocalDate;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
	readonly reason: string;
	readonly backupUserId: string;
	readonly status: LeaveStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly cancelledAt: string;
};

/**
 * StandupSchedule defines when a daily or weekly standup runs.
 */
export type StandupSchedule = {
	readonly id: string;
	readonly workspaceId: string;
	readonly templateId: string;
	readonly kind: StandupKind;
	readonly enabled: boolean;
	readonly timeOfDay: TimeOfDay;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: WeeklyMode | '';
	readonly skipDailyWhenWeeklyRuns: boolean;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
};

/**
 * ReminderRule defines DM and channel reminder behavior.
 *
 * reminderOffsets are minute offsets from the schedule time.
 * Example: schedule 09:00 with [0, 30, 45, 55] reminds at
 * 09:00, 09:30, 09:45, and 09:55.
 */
export type ReminderRule = {
	readonly id: string;
	readonly workspaceId: string;
	readonly scheduleId: string;
	readonly enabled: boolean;
	readonly channelReminderEnabled: boolean;
	readonly dmReminderEnabled: boolean;
	readonly reminderOffsets: readonly number[];
	readonly mentionMissingInChannel: boolean;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
};

/**
 * ReportRule defines generated report behavior for a schedule.
 */
export type ReportRule = {
	readonly id: string;
	readonly workspaceId: string;
	readonly scheduleId: string;
	readonly enabled: boolean;
	readonly reportKind: ReportKind;
	readonly postToChannel: boolean;
	readonly previewRequired: boolean;
	readonly sortMode: ReportSortMode;
	readonly includeOnLeave: boolean;
	readonly includeMissing: boolean;
	readonly includeTime: boolean;
	readonly includeBlockers: boolean;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
};
