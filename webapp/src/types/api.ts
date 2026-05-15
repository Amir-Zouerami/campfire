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
