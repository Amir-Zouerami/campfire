import type {
	CreateWorkspaceRequest,
	CreateWorkspaceResponse,
	ListAuditLogResponse,
	ListWorkspaceMembersResponse,
	ListWorkspaceRolesResponse,
	WorkspaceByChannelResponse,
} from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * getWorkspaceByChannel calls GET /workspaces/by-channel/{channelID}.
 */
export function getWorkspaceByChannel(channelID: string): Promise<WorkspaceByChannelResponse> {
	return requestJson<WorkspaceByChannelResponse>(`/workspaces/by-channel/${encodePath(channelID)}`);
}

/**
 * createWorkspace calls POST /workspaces.
 */
export function createWorkspace(request: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> {
	return requestJson<CreateWorkspaceResponse>('/workspaces', {
		method: 'POST',
		body: request,
	});
}

/**
 * listWorkspaceMembers calls GET /workspaces/{workspaceID}/members.
 */
export function listWorkspaceMembers(workspaceID: string): Promise<ListWorkspaceMembersResponse> {
	return requestJson<ListWorkspaceMembersResponse>(`/workspaces/${encodePath(workspaceID)}/members`);
}

/**
 * listWorkspaceRoles calls GET /workspaces/{workspaceID}/roles.
 */
export function listWorkspaceRoles(workspaceID: string): Promise<ListWorkspaceRolesResponse> {
	return requestJson<ListWorkspaceRolesResponse>(`/workspaces/${encodePath(workspaceID)}/roles`);
}

/**
 * listAuditLog calls GET /workspaces/{workspaceID}/audit.
 */
export function listAuditLog(workspaceID: string, limit: number): Promise<ListAuditLogResponse> {
	return requestJson<ListAuditLogResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/audit`, {
			limit,
		}),
	);
}
