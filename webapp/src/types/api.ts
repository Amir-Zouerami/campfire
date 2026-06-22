import type {
	AuditLogEntry,
	ApprovedLeaveRequest,
	DailyReportPreview,
	GlobalLeaveReportSummary,
	GlobalSkipDate,
	GlobalTimeReportSummary,
	LeaveDurationMode,
	LeaveHalfDayPart,
	LeaveRequest,
	LeaveStatus,
	LeaveType,
	PendingLeaveChangeRequest,
	PendingLeaveRequest,
	QuestionType,
	ReminderRule,
	ReportKind,
	ReportLanguage,
	CampfireLanguage,
	ReportRule,
	ReportRun,
	ReportSortMode,
	SavedReportFilter,
	StandupAnswer,
	StandupKind,
	StandupOccurrenceSummary,
	StandupQuestion,
	StandupRunDecision,
	StandupSchedule,
	StandupSubmission,
	StandupSubmissionSortMode,
	StandupTemplate,
	Task,
	Role,
	TaskStatus,
	TimeEntry,
	TimeOfDay,
	TimeReportSummary,
	WeeklyMode,
	WeeklyReportPreview,
	Workspace,
	WorkspaceCapabilities,
	WorkspaceOffDay,
	WorkspaceRoleOverview,
	WorkspaceWorkingDay,
} from './domain';

/**
 * ApiErrorBody is returned by failed Campfire API calls.
 */
export type ApiErrorBody = {
	readonly error: {
		readonly code: string;
		readonly message: string;
	};
};

/**
 * HealthResponse is returned by GET /health.
 */
export type HealthResponse = {
	readonly status: string;
	readonly product: string;
	readonly version: string;
};

/**
 * MeUserResponse contains the current Mattermost user's public identity.
 */
export type MeUserResponse = {
	readonly id: string;
	readonly username: string;
	readonly displayName: string;
	readonly email: string;
};

/**
 * MeResponse is returned by GET /me.
 */
export type MeResponse = {
	readonly user: MeUserResponse;
	readonly isSystemAdmin: boolean;
};


/**
 * ChannelProfile is the frontend representation of a Mattermost channel.
 */
export type ChannelProfile = {
	readonly id: string;
	readonly teamId: string;
	readonly teamName: string;
	readonly name: string;
	readonly displayName: string;
	readonly type: string;
};

/**
 * LookupChannelsRequest is sent to POST /channels/lookup.
 */
export type LookupChannelsRequest = {
	readonly channelIds: readonly string[];
};

/**
 * LookupChannelsResponse is returned by POST /channels/lookup.
 */
export type LookupChannelsResponse = {
	readonly channels: readonly ChannelProfile[];
};

/**
 * SearchChannelsResponse is returned by GET /channels/search.
 */
export type SearchChannelsResponse = {
	readonly channels: readonly ChannelProfile[];
};

/**
 * UserProfile is the frontend representation of a Mattermost user profile.
 */
export type UserProfile = {
	readonly id: string;
	readonly username: string;
	readonly displayName: string;
	readonly email: string;
};

/**
 * LookupUsersRequest is sent to POST /users/lookup.
 */
export type LookupUsersRequest = {
	readonly userIds: readonly string[];
};

/**
 * LookupUsersResponse is returned by POST /users/lookup.
 */
export type LookupUsersResponse = {
	readonly users: readonly UserProfile[];
};

/**
 * ListWorkspaceMembersResponse is returned by GET /workspaces/{workspaceID}/members.
 */
export type ListWorkspaceMembersResponse = {
	readonly users: readonly UserProfile[];
};

/**
 * WorkspaceByChannelResponse is returned by GET /workspaces/by-channel/{channelID}.
 */
export type WorkspaceByChannelResponse = {
	readonly workspace: Workspace;
	readonly capabilities: WorkspaceCapabilities;
};

/**
 * UpdateWorkspaceNotificationSettingsRequest is sent to PUT /workspaces/{workspaceID}/notification-settings.
 */
export type UpdateWorkspaceNotificationSettingsRequest = {
	readonly approvedLeaveNotificationChannelId: string;
	readonly leaveRequestNotificationRecipientIds: readonly string[];
	readonly leaveNotificationLanguage: ReportLanguage;
	readonly generatedMessageLanguage: CampfireLanguage;
};

/**
 * UpdateWorkspaceTimezoneRequest is sent to PUT /workspaces/{workspaceID}/timezone.
 */
export type UpdateWorkspaceTimezoneRequest = {
	readonly timezone: string;
};

/**
 * UpdateWorkspaceNotificationSettingsResponse is returned after workspace notification settings update.
 */
export type UpdateWorkspaceNotificationSettingsResponse = {
	readonly workspace: Workspace;
};

/**
 * UpdateWorkspaceTimezoneResponse is returned after workspace timezone update.
 */
export type UpdateWorkspaceTimezoneResponse = {
	readonly workspace: Workspace;
};

/**
 * CreateWorkspaceRequest is sent to POST /workspaces.
 */
export type CreateWorkspaceRequest = {
	readonly teamId: string;
	readonly channelId: string;
	readonly name: string;
	readonly description: string;
	readonly boardUrl: string;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly channelAdminsAreLeads: boolean;
	readonly namedLeadUserIds: readonly string[];
	readonly namedApproverUserIds: readonly string[];
	readonly createDefaultTemplates: boolean;
	readonly generatedMessageLanguage: CampfireLanguage;
};

/**
 * CreateWorkspaceResponse is returned by POST /workspaces.
 */
export type CreateWorkspaceResponse = {
	readonly workspace: Workspace;
};

/**
 * CreateGlobalSkipDateRequest is sent to POST /settings/global/skip-dates.
 */
export type CreateGlobalSkipDateRequest = {
	readonly date: string;
	readonly label: string;
};

/**
 * CreateGlobalSkipDateResponse is returned by POST /settings/global/skip-dates.
 */
export type CreateGlobalSkipDateResponse = {
	readonly skipDate: GlobalSkipDate;
};

/**
 * ListGlobalSkipDatesResponse is returned by GET /settings/global/skip-dates.
 */
export type ListGlobalSkipDatesResponse = {
	readonly skipDates: readonly GlobalSkipDate[];
};

/**
 * DeleteGlobalSkipDateResponse is returned by DELETE /settings/global/skip-dates/{skipDateID}.
 */
export type DeleteGlobalSkipDateResponse = {
	readonly deleted: boolean;
};

/**
 * ListWorkspaceWorkingDaysResponse is returned by GET /workspaces/{workspaceID}/working-days.
 */
export type ListWorkspaceWorkingDaysResponse = {
	readonly workingDays: readonly WorkspaceWorkingDay[];
};

/**
 * UpdateWorkspaceWorkingDaysRequest is sent to PUT /workspaces/{workspaceID}/working-days.
 */
export type UpdateWorkspaceWorkingDaysRequest = {
	readonly workingDays: readonly number[];
};

/**
 * UpdateWorkspaceWorkingDaysResponse is returned by PUT /workspaces/{workspaceID}/working-days.
 */
export type UpdateWorkspaceWorkingDaysResponse = {
	readonly workingDays: readonly WorkspaceWorkingDay[];
};

/**
 * CreateWorkspaceOffDayRequest is sent to POST /workspaces/{workspaceID}/off-days.
 */
export type CreateWorkspaceOffDayRequest = {
	readonly date: string;
	readonly label: string;
};

/**
 * CreateWorkspaceOffDayResponse is returned by POST /workspaces/{workspaceID}/off-days.
 */
export type CreateWorkspaceOffDayResponse = {
	readonly offDay: WorkspaceOffDay;
};

/**
 * ListWorkspaceOffDaysResponse is returned by GET /workspaces/{workspaceID}/off-days.
 */
export type ListWorkspaceOffDaysResponse = {
	readonly offDays: readonly WorkspaceOffDay[];
};

/**
 * DeleteWorkspaceOffDayResponse is returned by DELETE /workspaces/{workspaceID}/off-days/{offDayID}.
 */
export type DeleteWorkspaceOffDayResponse = {
	readonly deleted: boolean;
};

/**
 * ListWorkspaceRolesResponse is returned by GET /workspaces/{workspaceID}/roles.
 */
export type ListWorkspaceRolesResponse = {
	readonly roles: WorkspaceRoleOverview;
};

/**
 * UpsertWorkspaceRoleRequest is sent to POST /workspaces/{workspaceID}/roles.
 */
export type UpsertWorkspaceRoleRequest = {
	readonly userId: string;
	readonly role: Exclude<Role, 'member'>;
};

/**
 * UpsertWorkspaceRoleResponse is returned by POST /workspaces/{workspaceID}/roles.
 */
export type UpsertWorkspaceRoleResponse = {
	readonly roles: WorkspaceRoleOverview;
};

/**
 * DeleteWorkspaceRoleResponse is returned by DELETE /workspaces/{workspaceID}/roles/{role}/{userID}.
 */
export type DeleteWorkspaceRoleResponse = {
	readonly deleted: boolean;
	readonly roles: WorkspaceRoleOverview;
};

/**
 * ListLeaveTypesResponse is returned by GET /workspaces/{workspaceID}/leave-types.
 */
export type ListLeaveTypesResponse = {
	readonly leaveTypes: readonly LeaveType[];
};

/**
 * ValidateLeaveRequest is sent to POST /leaves/validate.
 */
export type ValidateLeaveRequest = {
	readonly workspaceId: string;
	readonly leaveTypeId: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
	readonly backupUserId: string;
	readonly canContactIfNeeded: boolean;
};

/**
 * ValidateLeaveResponse is returned by POST /leaves/validate.
 */
export type ValidateLeaveResponse = {
	readonly valid: boolean;
	readonly warnings: readonly string[];
};

/**
 * CreateLeaveRequest is sent to POST /leaves.
 */
export type CreateLeaveRequest = ValidateLeaveRequest & {
	readonly reason: string;
};

/**
 * CreateLeaveResponse is returned by POST /leaves.
 */
export type CreateLeaveResponse = {
	readonly leaveRequest: LeaveRequest;
};

/**
 * UpdateLeaveRequest is sent to PUT /leaves/{leaveRequestID}.
 */
export type UpdateLeaveRequest = {
	readonly leaveTypeId: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
	readonly reason: string;
	readonly backupUserId: string;
	readonly canContactIfNeeded: boolean;
};

/**
 * UpdateLeaveResponse is returned by PUT /leaves/{leaveRequestID}.
 */
export type UpdateLeaveResponse = {
	readonly leaveRequest: LeaveRequest;
};


/**
 * CreateLeaveChangeRequest is sent to POST /leaves/{leaveRequestID}/change-requests.
 */
export type CreateLeaveChangeRequest = UpdateLeaveRequest;

/**
 * CreateLeaveChangeResponse is returned after creating a leave edit request.
 */
export type CreateLeaveChangeResponse = {
	readonly changeRequest: PendingLeaveChangeRequest['changeRequest'];
};

/**
 * DecideLeaveChangeRequest is sent to POST /leaves/change-requests/{changeRequestID}/decision.
 */
export type DecideLeaveChangeRequest = {
	readonly decision: Extract<LeaveStatus, 'approved' | 'rejected'>;
	readonly comment: string;
};

/**
 * DecideLeaveChangeResponse is returned after deciding a leave edit request.
 */
export type DecideLeaveChangeResponse = {
	readonly changeRequest: PendingLeaveChangeRequest['changeRequest'];
	readonly leaveRequest: LeaveRequest;
};

/**
 * ListPendingLeaveChangeRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/change-requests/pending.
 */
export type ListPendingLeaveChangeRequestsResponse = {
	readonly changeRequests: readonly PendingLeaveChangeRequest[];
};

/**
 * DeleteWorkspaceResponse is returned by DELETE /workspaces/{workspaceID}.
 */
export type DeleteWorkspaceResponse = {
	readonly deleted: boolean;
};

/**
 * DecideLeaveRequest is sent to POST /leaves/{leaveRequestID}/decision.
 */
export type DecideLeaveRequest = {
	readonly decision: Extract<LeaveStatus, 'approved' | 'rejected'>;
	readonly comment: string;
};

/**
 * DecideLeaveResponse is returned by POST /leaves/{leaveRequestID}/decision.
 */
export type DecideLeaveResponse = {
	readonly leaveRequest: LeaveRequest;
};

/**
 * CancelLeaveRequestResponse is returned by POST /leaves/{leaveRequestID}/cancel.
 */
export type CancelLeaveRequestResponse = {
	readonly leaveRequest: LeaveRequest;
};

/**
 * ListPendingLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/pending.
 */
export type ListPendingLeaveRequestsResponse = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
};

/**
 * ListMyPendingLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/my-pending.
 */
export type ListMyPendingLeaveRequestsResponse = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
};

/**
 * ListMyActiveLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/my-active.
 */
export type ListMyActiveLeaveRequestsResponse = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
};

/**
 * ListApprovedLeaveRequestsResponse is returned by GET /workspaces/{workspaceID}/leaves/approved.
 */
export type ListApprovedLeaveRequestsResponse = {
	readonly leaveRequests: readonly ApprovedLeaveRequest[];
};

/**
 * ListStandupConfigurationResponse is returned by GET /workspaces/{workspaceID}/standups/configuration.
 */
export type ListStandupConfigurationResponse = {
	readonly templates: readonly StandupTemplate[];
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
};

/**
 * CreateStandupTemplateRequest is sent to POST /workspaces/{workspaceID}/standups/templates.
 */
export type CreateStandupTemplateRequest = {
	readonly name: string;
	readonly description: string;
	readonly kind: StandupKind;
	readonly isActive?: boolean;
};

/**
 * CreateStandupTemplateResponse is returned by POST /workspaces/{workspaceID}/standups/templates.
 */
export type CreateStandupTemplateResponse = {
	readonly template: StandupTemplate;
};

/**
 * UpdateStandupTemplateRequest is sent to PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export type UpdateStandupTemplateRequest = {
	readonly name: string;
	readonly description: string;
	readonly kind: StandupKind;
	readonly isActive: boolean;
};

/**
 * UpdateStandupTemplateResponse is returned by PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export type UpdateStandupTemplateResponse = {
	readonly template: StandupTemplate;
};

/**
 * DeleteStandupTemplateResponse is returned by DELETE /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export type DeleteStandupTemplateResponse = {
	readonly deleted: boolean;
};

/**
 * CreateStandupQuestionRequest is sent to POST /workspaces/{workspaceID}/standups/questions.
 */
export type CreateStandupQuestionRequest = {
	readonly templateId: string;
	readonly section: string;
	readonly label: string;
	readonly helpText: string;
	readonly placeholder: string;
	readonly type: QuestionType;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
	readonly createsTasks: boolean;
	readonly position: number;
	readonly options: readonly string[];
};

/**
 * CreateStandupQuestionResponse is returned by POST /workspaces/{workspaceID}/standups/questions.
 */
export type CreateStandupQuestionResponse = {
	readonly question: StandupQuestion;
};

/**
 * UpdateStandupQuestionRequest is sent to PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export type UpdateStandupQuestionRequest = CreateStandupQuestionRequest;

/**
 * UpdateStandupQuestionResponse is returned by PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export type UpdateStandupQuestionResponse = {
	readonly question: StandupQuestion;
};

/**
 * DeleteStandupQuestionResponse is returned by DELETE /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export type DeleteStandupQuestionResponse = {
	readonly deleted: boolean;
};

/**
 * CreateStandupScheduleRequest is sent to POST /workspaces/{workspaceID}/standups/schedules.
 */
export type CreateStandupScheduleRequest = {
	readonly templateId: string;
	readonly kind: StandupKind;
	readonly enabled: boolean;
	readonly opensAt: TimeOfDay;
	readonly timeOfDay: TimeOfDay;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: WeeklyMode | 'none';
	readonly skipDailyWhenWeeklyRuns: boolean;
};

/**
 * CreateStandupScheduleResponse is returned by POST /workspaces/{workspaceID}/standups/schedules.
 */
export type CreateStandupScheduleResponse = {
	readonly schedule: StandupSchedule;
};

/**
 * UpdateStandupScheduleRequest is sent to PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export type UpdateStandupScheduleRequest = CreateStandupScheduleRequest;

/**
 * UpdateStandupScheduleResponse is returned by PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export type UpdateStandupScheduleResponse = {
	readonly schedule: StandupSchedule;
};

/**
 * DeleteStandupScheduleResponse is returned by DELETE /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export type DeleteStandupScheduleResponse = {
	readonly deleted: boolean;
};

/**
 * SubmitStandupAnswerRequest contains one submitted answer.
 */
export type SubmitStandupAnswerRequest = {
	readonly questionId: string;
	readonly valueJson: string;
};

/**
 * SubmitStandupRequest is sent to POST /standups/submissions.
 */
export type SubmitStandupRequest = {
	readonly workspaceId: string;
	readonly templateId: string;
	readonly scheduleId: string;
	readonly occurrenceDate: string;
	readonly answers: readonly SubmitStandupAnswerRequest[];
};

/**
 * SubmitStandupResponse is returned by POST /standups/submissions.
 */
export type SubmitStandupResponse = {
	readonly submission: StandupSubmission;
	readonly answers: readonly StandupAnswer[];
	readonly createdTasks: readonly Task[];
};


/**
 * GetMyStandupSubmissionRequest is used for GET /workspaces/{workspaceID}/standups/my-submission.
 */
export type GetMyStandupSubmissionRequest = {
	readonly workspaceId: string;
	readonly occurrenceDate: string;
	readonly templateId?: string;
};

/**
 * GetMyStandupSubmissionResponse is returned when loading the current user's stored standup.
 */
export type GetMyStandupSubmissionResponse = {
	readonly submission: StandupSubmission | null;
	readonly answers: readonly StandupAnswer[];
};

/**
 * ListStandupSubmissionsRequest is used for GET /workspaces/{workspaceID}/standups/submissions.
 */
export type ListStandupSubmissionsRequest = {
	readonly workspaceId: string;
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
};

/**
 * StandupSubmissionWithAnswers contains one submission and its answers.
 */
export type StandupSubmissionWithAnswers = {
	readonly submission: StandupSubmission;
	readonly answers: readonly StandupAnswer[];
};

/**
 * ListStandupSubmissionsResponse is returned by GET /workspaces/{workspaceID}/standups/submissions.
 */
export type ListStandupSubmissionsResponse = StandupOccurrenceSummary;

/**
 * EvaluateStandupDayResponse is returned by GET /workspaces/{workspaceID}/standup-runtime/day.
 */
export type EvaluateStandupDayResponse = {
	readonly decision: StandupRunDecision;
};

/**
 * CreateTaskRequest is sent to POST /workspaces/{workspaceID}/tasks.
 */
export type CreateTaskRequest = {
	readonly title: string;
	readonly description: string;
	readonly projectId: string;
	readonly categoryId: string;
	readonly boardUrl: string;
};

/**
 * CreateTaskResponse is returned by POST /workspaces/{workspaceID}/tasks.
 */
export type CreateTaskResponse = {
	readonly task: Task;
};

/**
 * UpdateTaskRequest is sent to PUT /workspaces/{workspaceID}/tasks/{taskID}.
 */
export type UpdateTaskRequest = {
	readonly title: string;
	readonly description: string;
	readonly status: TaskStatus;
	readonly projectId: string;
	readonly categoryId: string;
	readonly boardUrl: string;
};

/**
 * UpdateTaskResponse is returned by PUT /workspaces/{workspaceID}/tasks/{taskID}.
 */
export type UpdateTaskResponse = {
	readonly task: Task;
};

/**
 * ListMyTasksResponse is returned by GET /workspaces/{workspaceID}/tasks/my.
 */
export type ListMyTasksResponse = {
	readonly tasks: readonly Task[];
};

/**
 * CreateTimeEntryRequest is sent to POST /workspaces/{workspaceID}/time.
 */
export type CreateTimeEntryRequest = {
	readonly taskId: string;
	readonly entryDate: string;
	readonly minutes: number;
	readonly note: string;
	readonly projectId: string;
	readonly categoryId: string;
};

/**
 * CreateTimeEntryResponse is returned by POST /workspaces/{workspaceID}/time.
 */
export type CreateTimeEntryResponse = {
	readonly timeEntry: TimeEntry;
};

/**
 * ListMyTimeEntriesResponse is returned by GET /workspaces/{workspaceID}/time/my.
 */
export type ListMyTimeEntriesResponse = {
	readonly timeEntries: readonly TimeEntry[];
};

/**
 * GetTimeReportSummaryResponse is returned by GET /workspaces/{workspaceID}/reports/time-summary.
 */
export type GetTimeReportSummaryResponse = {
	readonly summary: TimeReportSummary;
};

/**
 * GetDailyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/daily-preview.
 */
export type GetDailyReportPreviewResponse = {
	readonly preview: DailyReportPreview;
};

/**
 * ReportCalendarLabels contains browser-rendered, display-only alternate calendar labels keyed by YYYY-MM-DD.
 */
export type ReportCalendarLabels = Readonly<Record<string, string>>;

/**
 * PostDailyReportPreviewRequest is sent to POST /workspaces/{workspaceID}/reports/daily-preview/post.
 */
export type PostDailyReportPreviewRequest = {
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
	readonly calendarLabels?: ReportCalendarLabels;
};

/**
 * PostDailyReportPreviewResponse is returned by POST /workspaces/{workspaceID}/reports/daily-preview/post.
 */
export type PostDailyReportPreviewResponse = {
	readonly reportRun: ReportRun;
};

/**
 * GetWeeklyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/weekly-preview.
 */
export type GetWeeklyReportPreviewResponse = {
	readonly preview: WeeklyReportPreview;
};

/**
 * PostWeeklyReportPreviewRequest is sent to POST /workspaces/{workspaceID}/reports/weekly-preview/post.
 */
export type PostWeeklyReportPreviewRequest = {
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly sortMode: ReportSortMode;
	readonly calendarLabels?: ReportCalendarLabels;
};

/**
 * PostWeeklyReportPreviewResponse is returned by POST /workspaces/{workspaceID}/reports/weekly-preview/post.
 */
export type PostWeeklyReportPreviewResponse = {
	readonly reportRun: ReportRun;
};

/**
 * ListDailyReportRunsResponse is returned by GET /workspaces/{workspaceID}/reports/daily-runs.
 */
export type ListDailyReportRunsResponse = {
	readonly reportRuns: readonly ReportRun[];
};

/**
 * CreateSavedReportFilterRequest is sent to POST /workspaces/{workspaceID}/reports/saved-filters.
 */
export type CreateSavedReportFilterRequest = {
	readonly name: string;
	readonly scope: 'workspace';
	readonly reportType: ReportKind;
	readonly filterJson: string;
};

/**
 * CreateSavedReportFilterResponse is returned by POST /workspaces/{workspaceID}/reports/saved-filters.
 */
export type CreateSavedReportFilterResponse = {
	readonly filter: SavedReportFilter;
};

/**
 * ListSavedReportFiltersResponse is returned by GET /workspaces/{workspaceID}/reports/saved-filters.
 */
export type ListSavedReportFiltersResponse = {
	readonly filters: readonly SavedReportFilter[];
};

/**
 * DeleteSavedReportFilterResponse is returned by DELETE /workspaces/{workspaceID}/reports/saved-filters/{filterID}.
 */
export type DeleteSavedReportFilterResponse = {
	readonly ok: boolean;
};

/**
 * ListReminderRulesResponse is returned by GET /workspaces/{workspaceID}/reminders.
 */
export type ListReminderRulesResponse = {
	readonly reminderRules: readonly ReminderRule[];
};

/**
 * UpdateReminderRuleRequest is sent to PUT /workspaces/{workspaceID}/reminders/{reminderRuleID}.
 */
export type UpdateReminderRuleRequest = {
	readonly enabled: boolean;
	readonly channelReminderEnabled: boolean;
	readonly dmReminderEnabled: boolean;
	readonly reminderOffsets: readonly number[];
	readonly mentionMissingInChannel: boolean;
};

/**
 * UpdateReminderRuleResponse is returned by PUT /workspaces/{workspaceID}/reminders/{reminderRuleID}.
 */
export type UpdateReminderRuleResponse = {
	readonly reminderRule: ReminderRule;
};

/**
 * ListReportRulesResponse is returned by GET /workspaces/{workspaceID}/reports/rules.
 */
export type ListReportRulesResponse = {
	readonly reportRules: readonly ReportRule[];
};

/**
 * UpdateReportRuleRequest is sent to PUT /workspaces/{workspaceID}/reports/rules/{reportRuleID}.
 */
export type UpdateReportRuleRequest = {
	readonly enabled: boolean;
	readonly postToChannel: boolean;
	readonly previewRequired: boolean;
	readonly sortMode: ReportSortMode;
	readonly reportLanguage: ReportLanguage;
	readonly includeOnLeave: boolean;
	readonly includeMissing: boolean;
	readonly includeTime: boolean;
	readonly includeBlockers: boolean;
};

/**
 * UpdateReportRuleResponse is returned by PUT /workspaces/{workspaceID}/reports/rules/{reportRuleID}.
 */
export type UpdateReportRuleResponse = {
	readonly reportRule: ReportRule;
};


/**
 * DataRetentionSummary describes old operational rows targeted by retention cleanup.
 */
export type DataRetentionSummary = {
	readonly cutoffDate: string;
	readonly standupSubmissions: number;
	readonly standupAnswers: number;
	readonly leaveRequests: number;
	readonly leaveDecisions: number;
	readonly timeEntries: number;
	readonly reportRuns: number;
	readonly notificationRuns: number;
	readonly auditLogEntries: number;
	readonly totalRows: number;
};

/**
 * GetDataRetentionPreviewResponse is returned by GET /workspaces/{workspaceID}/admin/data-retention/preview.
 */
export type GetDataRetentionPreviewResponse = {
	readonly summary: DataRetentionSummary;
};

/**
 * PurgeWorkspaceDataRequest is sent to POST /workspaces/{workspaceID}/admin/data-retention/purge.
 */
export type PurgeWorkspaceDataRequest = {
	readonly cutoffDate: string;
};

/**
 * PurgeWorkspaceDataResponse is returned by POST /workspaces/{workspaceID}/admin/data-retention/purge.
 */
export type PurgeWorkspaceDataResponse = {
	readonly summary: DataRetentionSummary;
	readonly deleted: boolean;
};

/**
 * ListAuditLogResponse is returned by GET /workspaces/{workspaceID}/audit.
 */
export type ListAuditLogResponse = {
	readonly entries: readonly AuditLogEntry[];
};

/**
 * GetGlobalTimeReportSummaryResponse is returned by GET /reports/global/time-summary.
 */
export type GetGlobalTimeReportSummaryResponse = {
	readonly summary: GlobalTimeReportSummary;
};

/**
 * GetGlobalLeaveReportSummaryResponse is returned by GET /reports/global/leaves.
 */
export type GetGlobalLeaveReportSummaryResponse = {
	readonly summary: GlobalLeaveReportSummary;
};
