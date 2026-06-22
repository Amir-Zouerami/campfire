/**
 * CampfireQueryKey is the readonly tuple type used for TanStack Query keys.
 */
export type CampfireQueryKey = readonly [scope: 'campfire', ...parts: readonly unknown[]];

/**
 * campfireQueryKeys centralizes cache-key construction for all Campfire data.
 *
 * Keeping keys here prevents feature hooks from inventing incompatible cache
 * shapes as the frontend migrates away from ad-hoc useEffect fetch logic.
 */
export const campfireQueryKeys = {
	all: ['campfire'] as const,

	bootstrap: (
		openSequence: number,
		channelID: string | null,
		channelType: string | null,
		teamID: string | null,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.all,
		'bootstrap',
		openSequence,
		channelID,
		channelType,
		teamID,
		refreshToken,
	],

	workspace: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.all,
		'workspaces',
		workspaceID,
	],

	workspaceByChannel: (channelID: string): CampfireQueryKey => [
		...campfireQueryKeys.all,
		'workspaces',
		'by-channel',
		channelID,
	],

	workspaceCollection: (workspaceID: string, collection: string): CampfireQueryKey => [
		...campfireQueryKeys.workspace(workspaceID),
		collection,
	],

	workspaceCollectionDetail: (
		workspaceID: string,
		collection: string,
		...detailParts: readonly unknown[]
	): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, collection),
		...detailParts,
	],



	workingCalendars: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'working-calendar'),
	],

	workingCalendar: (workspaceID: string, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.workingCalendars(workspaceID),
		refreshToken,
	],

	globalOffDays: (): CampfireQueryKey => [
		...campfireQueryKeys.all,
		'global-off-days',
	],

	auditLog: (workspaceID: string, limit: number, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'audit-log'),
		limit,
		refreshToken,
	],

	dataRetention: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'data-retention'),
	],

	dataRetentionPreview: (workspaceID: string, cutoffDate: string, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.dataRetention(workspaceID),
		'preview',
		cutoffDate,
		refreshToken,
	],

	workspaceRoles: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'roles'),
	],

	reminderSettings: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'reminders'),
	],

	reportRulesSettings: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'report-rules'),
	],

	standupSettings: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'standup-settings'),
	],

	standupSettingsConfiguration: (workspaceID: string, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.standupSettings(workspaceID),
		'configuration',
		refreshToken,
	],

	myDay: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'my-day'),
	],

	myTasks: (workspaceID: string, includeArchived: boolean): CampfireQueryKey => [
		...campfireQueryKeys.myDay(workspaceID),
		'tasks',
		includeArchived,
	],

	myTimeEntries: (
		workspaceID: string,
		startDate: string,
		endDate: string,
	): CampfireQueryKey => [
		...campfireQueryKeys.myDay(workspaceID),
		'time-entries',
		startDate,
		endDate,
	],

	myTimeSnapshot: (
		workspaceID: string,
		includeArchived: boolean,
		startDate: string,
		endDate: string,
	): CampfireQueryKey => [
		...campfireQueryKeys.myDay(workspaceID),
		'time-snapshot',
		includeArchived,
		startDate,
		endDate,
	],

	myLeaveSnapshot: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.myDay(workspaceID),
		'leave-snapshot',
	],

	teamReview: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'team-review'),
	],

	teamStandups: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.teamReview(workspaceID),
		'standups',
	],

	teamAvailability: (
		workspaceID: string,
		startDate: string,
		endDate: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.teamReview(workspaceID),
		'availability',
		startDate,
		endDate,
		refreshToken,
	],

	teamLeaveApprovals: (workspaceID: string, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.teamReview(workspaceID),
		'leave-approvals',
		refreshToken,
	],

	teamRuntime: (workspaceID: string, date: string, refreshToken: number): CampfireQueryKey => [
		...campfireQueryKeys.teamReview(workspaceID),
		'runtime',
		date,
		refreshToken,
	],

	teamStandupReview: (
		workspaceID: string,
		occurrenceDate: string,
		sortMode: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.teamStandups(workspaceID),
		occurrenceDate,
		sortMode,
		refreshToken,
	],

	myApprovedLeaves: (workspaceID: string, startDate: string, endDate: string): CampfireQueryKey => [
		...campfireQueryKeys.myDay(workspaceID),
		'approved-leaves',
		startDate,
		endDate,
	],

	reportPreviews: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'report-previews'),
	],

	dailyReportPreview: (
		workspaceID: string,
		occurrenceDate: string,
		sortMode: string,
		timezone: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.reportPreviews(workspaceID),
		'daily',
		occurrenceDate,
		sortMode,
		timezone,
		refreshToken,
	],

	weeklyReportPreview: (
		workspaceID: string,
		periodStart: string,
		periodEnd: string,
		sortMode: string,
		timezone: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.reportPreviews(workspaceID),
		'weekly',
		periodStart,
		periodEnd,
		sortMode,
		timezone,
		refreshToken,
	],

	savedReportFilters: (workspaceID: string, reportType: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'saved-report-filters'),
		reportType,
	],


	globalReports: (): CampfireQueryKey => [
		...campfireQueryKeys.all,
		'global-reports',
	],

	globalTimeReportSummary: (
		startDate: string,
		endDate: string,
		groupBy: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.globalReports(),
		'time-summary',
		startDate,
		endDate,
		groupBy,
		refreshToken,
	],

	globalLeaveReportSummary: (
		startDate: string,
		endDate: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.globalReports(),
		'leave-summary',
		startDate,
		endDate,
		refreshToken,
	],

	timeReports: (workspaceID: string): CampfireQueryKey => [
		...campfireQueryKeys.workspaceCollection(workspaceID, 'time-reports'),
	],

	timeReportSummary: (
		workspaceID: string,
		startDate: string,
		endDate: string,
		groupBy: string,
		refreshToken: number,
	): CampfireQueryKey => [
		...campfireQueryKeys.timeReports(workspaceID),
		'summary',
		startDate,
		endDate,
		groupBy,
		refreshToken,
	],
} as const;
