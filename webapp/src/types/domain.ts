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
