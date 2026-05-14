import type { GlobalSkipDate, LocalDate, Workspace, WorkspaceCapabilities } from './domain';

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
