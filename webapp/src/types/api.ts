import type {
	GlobalSkipDate,
	LeaveDurationMode,
	LeaveHalfDayPart,
	LeaveRequest,
	LeaveStatus,
	LeaveType,
	LocalDate,
	PendingLeaveRequest,
	ApprovedLeaveRequest,
	TimeOfDay,
	Workspace,
	WorkspaceCapabilities,
	StandupRunDecision,
	StandupQuestion,
	StandupTemplate,
	StandupSchedule,
	StandupAnswer,
	StandupSubmission,
	StandupOccurrenceSummary,
	StandupSubmissionSortMode,
	DailyReportPreview,
	ReportRun,
	WorkspaceOffDay,
	WorkspaceWorkingDay,
	ReminderRule,
	ReportRule,
	SavedReportFilter,
	Task,
	TimeEntry,
	TaskStatus,
	TimeReportSummary,
	GlobalTimeReportSummary,
	WeeklyReportPreview,
	ReportSortMode,
	ReportKind,
} from './domain';

/**
 * HealthResponse is returned by GET /api/v1/health.
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
 * MeResponse is returned by GET /api/v1/me.
 */
export type MeResponse = {
	readonly user: MeUserResponse;
	readonly isSystemAdmin: boolean;
};

/**
 * WorkspaceByChannelResponse is returned by GET /workspaces/by-channel/{channelID}.
 */
export type WorkspaceByChannelResponse = {
	readonly workspace: Workspace;
	readonly capabilities: WorkspaceCapabilities;
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
};

/**
 * CreateWorkspaceResponse is returned by POST /workspaces.
 */
export type CreateWorkspaceResponse = {
	readonly workspace: Workspace;
};

/**
 * ListGlobalSkipDatesResponse is returned by GET /settings/global/skip-dates.
 */
export type ListGlobalSkipDatesResponse = {
	readonly skipDates: readonly GlobalSkipDate[];
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
 * ListWorkspaceOffDaysResponse is returned by GET /workspaces/{workspaceID}/off-days.
 */
export type ListWorkspaceOffDaysResponse = {
	readonly offDays: readonly WorkspaceOffDay[];
};

/**
 * CreateWorkspaceOffDayRequest is sent to POST /workspaces/{workspaceID}/off-days.
 */
export type CreateWorkspaceOffDayRequest = {
	readonly date: LocalDate;
	readonly label: string;
};

/**
 * CreateWorkspaceOffDayResponse is returned by POST /workspaces/{workspaceID}/off-days.
 */
export type CreateWorkspaceOffDayResponse = {
	readonly offDay: WorkspaceOffDay;
};

/**
 * DeleteWorkspaceOffDayResponse is returned by DELETE /workspaces/{workspaceID}/off-days/{offDayID}.
 */
export type DeleteWorkspaceOffDayResponse = {
	readonly deleted: boolean;
};

/**
 * CreateGlobalSkipDateRequest is sent to POST /settings/global/skip-dates.
 */
export type CreateGlobalSkipDateRequest = {
	readonly date: LocalDate;
	readonly label: string;
};

/**
 * CreateGlobalSkipDateResponse is returned by POST /settings/global/skip-dates.
 */
export type CreateGlobalSkipDateResponse = {
	readonly skipDate: GlobalSkipDate;
};

/**
 * DeleteGlobalSkipDateResponse is returned by DELETE /settings/global/skip-dates/{skipDateID}.
 */
export type DeleteGlobalSkipDateResponse = {
	readonly deleted: boolean;
};

/**
 * ListLeaveTypesResponse is returned by GET /workspaces/{workspaceID}/leave-types.
 */
export type ListLeaveTypesResponse = {
	readonly leaveTypes: readonly LeaveType[];
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
 * ListMyActiveLeaveRequestsResponse is returned by the current user's active leave request endpoint.
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
 * EvaluateStandupDayResponse is returned by GET /workspaces/{workspaceID}/standup-runtime/day.
 */
export type EvaluateStandupDayResponse = {
	readonly decision: StandupRunDecision;
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
	readonly kind: string;
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
	readonly kind: string;
	readonly isActive: boolean;
};

/**
 * UpdateStandupTemplateResponse is returned by PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
 */
export type UpdateStandupTemplateResponse = {
	readonly template: StandupTemplate;
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
	readonly type: string;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
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
export type UpdateStandupQuestionRequest = {
	readonly templateId: string;
	readonly section: string;
	readonly label: string;
	readonly helpText: string;
	readonly placeholder: string;
	readonly type: string;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
	readonly position: number;
	readonly options: readonly string[];
};

/**
 * UpdateStandupQuestionResponse is returned by PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
 */
export type UpdateStandupQuestionResponse = {
	readonly question: StandupQuestion;
};

/**
 * CreateStandupScheduleRequest is sent to POST /workspaces/{workspaceID}/standups/schedules.
 */
export type CreateStandupScheduleRequest = {
	readonly templateId: string;
	readonly kind: string;
	readonly enabled: boolean;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: string;
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
export type UpdateStandupScheduleRequest = {
	readonly templateId: string;
	readonly kind: string;
	readonly enabled: boolean;
	readonly timeOfDay: string;
	readonly skipNonWorkingDays: boolean;
	readonly weeklyMode: string;
	readonly skipDailyWhenWeeklyRuns: boolean;
};

/**
 * UpdateStandupScheduleResponse is returned by PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
 */
export type UpdateStandupScheduleResponse = {
	readonly schedule: StandupSchedule;
};

/**
 * SubmitStandupAnswerRequest is one submitted standup answer.
 */
export type SubmitStandupAnswerRequest = {
	readonly questionId: string;
	readonly valueJson: string;
};

/**
 * ListStandupSubmissionsResponse is returned by GET /workspaces/{workspaceID}/standups/submissions.
 */
export type ListStandupSubmissionsResponse = StandupOccurrenceSummary;

/**
 * ListStandupSubmissionsRequest contains frontend query filters.
 */
export type ListStandupSubmissionsRequest = {
	readonly workspaceId: string;
	readonly occurrenceDate: LocalDate;
	readonly sortMode: StandupSubmissionSortMode;
};

/**
 * SubmitStandupRequest is sent to POST /standups/submissions.
 */
export type SubmitStandupRequest = {
	readonly workspaceId: string;
	readonly templateId: string;
	readonly scheduleId: string;
	readonly occurrenceDate: LocalDate;
	readonly answers: readonly SubmitStandupAnswerRequest[];
};

/**
 * SubmitStandupResponse is returned by POST /standups/submissions.
 */
export type SubmitStandupResponse = {
	readonly submission: StandupSubmission;
	readonly answers: readonly StandupAnswer[];
};

/**
 * ValidateLeaveRequest is sent to POST /leaves/validate.
 */
export type ValidateLeaveRequest = {
	readonly workspaceId: string;
	readonly startDate: LocalDate;
	readonly endDate: LocalDate;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
};

/**
 * ValidateLeaveResponse is returned by POST /leaves/validate.
 */
export type ValidateLeaveResponse = {
	readonly valid: boolean;
};

/**
 * CreateLeaveRequest is sent to POST /leaves.
 */
export type CreateLeaveRequest = {
	readonly workspaceId: string;
	readonly leaveTypeId: string;
	readonly startDate: LocalDate;
	readonly endDate: LocalDate;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
	readonly reason: string;
	readonly backupUserId: string;
};

/**
 * CreateLeaveResponse is returned by POST /leaves.
 */
export type CreateLeaveResponse = {
	readonly leaveRequest: LeaveRequest;
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
 * GetDailyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/daily-preview.
 */
export type GetDailyReportPreviewResponse = {
	readonly preview: DailyReportPreview;
};

/**
 * GetWeeklyReportPreviewResponse is returned by GET /workspaces/{workspaceID}/reports/weekly-preview.
 */
export type GetWeeklyReportPreviewResponse = {
	readonly preview: WeeklyReportPreview;
};

/**
 * ListDailyReportRunsResponse is returned by GET /workspaces/{workspaceID}/reports/daily-runs.
 */
export type ListDailyReportRunsResponse = {
	readonly runs: readonly ReportRun[];
};

/**
 * ListSavedReportFiltersResponse is returned by GET /workspaces/{workspaceID}/reports/saved-filters.
 */
export type ListSavedReportFiltersResponse = {
	readonly filters: readonly SavedReportFilter[];
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
 * DeleteSavedReportFilterResponse is returned by DELETE /workspaces/{workspaceID}/reports/saved-filters/{filterID}.
 */
export type DeleteSavedReportFilterResponse = {
	readonly deleted: boolean;
};

/**
 * GetTimeReportSummaryResponse is returned by GET /workspaces/{workspaceID}/reports/time-summary.
 */
export type GetTimeReportSummaryResponse = {
	readonly summary: TimeReportSummary;
};

/**
 * GetGlobalTimeReportSummaryResponse is returned by GET /reports/global/time-summary.
 */
export type GetGlobalTimeReportSummaryResponse = {
	readonly summary: GlobalTimeReportSummary;
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
	readonly sortMode: string;
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
 * ListMyTasksResponse is returned by GET /workspaces/{workspaceID}/tasks/my.
 */
export type ListMyTasksResponse = {
	readonly tasks: readonly Task[];
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
	readonly projectId: string;
	readonly categoryId: string;
	readonly status: TaskStatus;
	readonly boardUrl: string;
};

/**
 * UpdateTaskResponse is returned by PUT /workspaces/{workspaceID}/tasks/{taskID}.
 */
export type UpdateTaskResponse = {
	readonly task: Task;
};

/**
 * ListMyTimeEntriesResponse is returned by GET /workspaces/{workspaceID}/time-entries/my.
 */
export type ListMyTimeEntriesResponse = {
	readonly timeEntries: readonly TimeEntry[];
};

/**
 * CreateTimeEntryRequest is sent to POST /workspaces/{workspaceID}/time-entries.
 */
export type CreateTimeEntryRequest = {
	readonly taskId: string;
	readonly entryDate: LocalDate;
	readonly minutes: number;
	readonly note: string;
	readonly projectId: string;
	readonly categoryId: string;
};

/**
 * CreateTimeEntryResponse is returned by POST /workspaces/{workspaceID}/time-entries.
 */
export type CreateTimeEntryResponse = {
	readonly timeEntry: TimeEntry;
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
 * PostDailyReportPreviewRequest is sent to POST /workspaces/{workspaceID}/reports/daily-preview/post.
 */
export type PostDailyReportPreviewRequest = {
	readonly occurrenceDate: LocalDate;
	readonly sortMode: StandupSubmissionSortMode;
};

/**
 * PostDailyReportPreviewResponse is returned after posting a daily report preview.
 */
export type PostDailyReportPreviewResponse = {
	readonly preview: DailyReportPreview;
	readonly run: ReportRun;
	readonly posted: boolean;
};

/**
 * PostWeeklyReportPreviewRequest is sent to POST /workspaces/{workspaceID}/reports/weekly-preview/post.
 */
export type PostWeeklyReportPreviewRequest = {
	readonly periodStart: LocalDate;
	readonly periodEnd: LocalDate;
	readonly sortMode: ReportSortMode;
};

/**
 * PostWeeklyReportPreviewResponse is returned after posting a weekly report preview.
 */
export type PostWeeklyReportPreviewResponse = {
	readonly preview: WeeklyReportPreview;
	readonly run: ReportRun;
	readonly posted: boolean;
};

/**
 * ApiErrorPayload is the standard Campfire API error payload.
 */
export type ApiErrorPayload = {
	readonly code: string;
	readonly message: string;
};

/**
 * ApiErrorBody is the standard Campfire API error response body.
 */
export type ApiErrorBody = {
	readonly error: ApiErrorPayload;
};
