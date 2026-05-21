import type {
	CreateTaskRequest,
	CreateTaskResponse,
	ListMyTasksResponse,
	UpdateTaskRequest,
	UpdateTaskResponse,
} from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * listMyTasks calls GET /workspaces/{workspaceID}/tasks/my.
 */
export function listMyTasks(workspaceID: string, includeArchived: boolean): Promise<ListMyTasksResponse> {
	return requestJson<ListMyTasksResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/tasks/my`, {
			includeArchived,
		}),
	);
}

/**
 * createTask calls POST /workspaces/{workspaceID}/tasks.
 */
export function createTask(workspaceID: string, request: CreateTaskRequest): Promise<CreateTaskResponse> {
	return requestJson<CreateTaskResponse>(`/workspaces/${encodePath(workspaceID)}/tasks`, {
		method: 'POST',
		body: request,
	});
}

/**
 * updateTask calls PUT /workspaces/{workspaceID}/tasks/{taskID}.
 */
export function updateTask(
	workspaceID: string,
	taskID: string,
	request: UpdateTaskRequest,
): Promise<UpdateTaskResponse> {
	return requestJson<UpdateTaskResponse>(`/workspaces/${encodePath(workspaceID)}/tasks/${encodePath(taskID)}`, {
		method: 'PUT',
		body: request,
	});
}
