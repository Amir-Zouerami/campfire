import type {
	CreateWorkspaceRequest,
	CreateWorkspaceResponse,
	DeleteWorkspaceRoleResponse,
	ListAuditLogResponse,
	ListWorkspaceMembersResponse,
	ListWorkspaceRolesResponse,
	UpsertWorkspaceRoleRequest,
	UpsertWorkspaceRoleResponse,
	WorkspaceByChannelResponse,
} from '@/types/api';
import type { Role } from '@/types/domain';

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
 * upsertWorkspaceRole calls POST /workspaces/{workspaceID}/roles.
 */
export function upsertWorkspaceRole(
	workspaceID: string,
	request: UpsertWorkspaceRoleRequest,
): Promise<UpsertWorkspaceRoleResponse> {
	return requestJson<UpsertWorkspaceRoleResponse>(`/workspaces/${encodePath(workspaceID)}/roles`, {
		method: 'POST',
		body: request,
	});
}

/**
 * deleteWorkspaceRole calls DELETE /workspaces/{workspaceID}/roles/{role}/{userID}.
 */
export function deleteWorkspaceRole(
	workspaceID: string,
	role: Exclude<Role, 'member'>,
	userID: string,
): Promise<DeleteWorkspaceRoleResponse> {
	return requestJson<DeleteWorkspaceRoleResponse>(
		`/workspaces/${encodePath(workspaceID)}/roles/${encodePath(role)}/${encodePath(userID)}`,
		{
			method: 'DELETE',
		},
	);
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
