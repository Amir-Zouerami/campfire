import type {
	CancelLeaveRequestResponse,
	CreateLeaveChangeRequest,
	CreateLeaveChangeResponse,
	CreateLeaveDeletionRequest,
	CreateLeaveDeletionResponse,
	CreateLeaveRequest,
	CreateLeaveResponse,
	DecideLeaveChangeRequest,
	DecideLeaveChangeResponse,
	DecideLeaveRequest,
	DecideLeaveResponse,
	ListApprovedLeaveRequestsResponse,
	ListLeaveTypesResponse,
	ListMyActiveLeaveRequestsResponse,
	ListPendingLeaveChangeRequestsResponse,
	ListMyPendingLeaveRequestsResponse,
	ListPendingLeaveRequestsResponse,
	UpdateLeaveRequest,
	UpdateLeaveResponse,
	ValidateLeaveRequest,
	ValidateLeaveResponse,
} from '@/types/api';

import { encodePath, requestJson, withQuery } from './http';

/**
 * listLeaveTypes calls GET /workspaces/{workspaceID}/leave-types.
 */
export function listLeaveTypes(workspaceID: string): Promise<ListLeaveTypesResponse> {
	return requestJson<ListLeaveTypesResponse>(`/workspaces/${encodePath(workspaceID)}/leave-types`);
}

/**
 * listPendingLeaveRequests calls GET /workspaces/{workspaceID}/leaves/pending.
 */
export function listPendingLeaveRequests(workspaceID: string): Promise<ListPendingLeaveRequestsResponse> {
	return requestJson<ListPendingLeaveRequestsResponse>(`/workspaces/${encodePath(workspaceID)}/leaves/pending`);
}


/**
 * listPendingLeaveChangeRequests calls GET /workspaces/{workspaceID}/leaves/change-requests/pending.
 */
export function listPendingLeaveChangeRequests(workspaceID: string): Promise<ListPendingLeaveChangeRequestsResponse> {
	return requestJson<ListPendingLeaveChangeRequestsResponse>(`/workspaces/${encodePath(workspaceID)}/leaves/change-requests/pending`);
}

/**
 * listMyPendingLeaveRequests calls GET /workspaces/{workspaceID}/leaves/my-pending.
 */
export function listMyPendingLeaveRequests(workspaceID: string): Promise<ListMyPendingLeaveRequestsResponse> {
	return requestJson<ListMyPendingLeaveRequestsResponse>(`/workspaces/${encodePath(workspaceID)}/leaves/my-pending`);
}

/**
 * listMyActiveLeaveRequests calls GET /workspaces/{workspaceID}/leaves/my-active.
 */
export function listMyActiveLeaveRequests(workspaceID: string): Promise<ListMyActiveLeaveRequestsResponse> {
	return requestJson<ListMyActiveLeaveRequestsResponse>(`/workspaces/${encodePath(workspaceID)}/leaves/my-active`);
}

/**
 * listApprovedLeaveRequests calls GET /workspaces/{workspaceID}/leaves/approved.
 */
export function listApprovedLeaveRequests(
	workspaceID: string,
	startDate: string,
	endDate: string,
): Promise<ListApprovedLeaveRequestsResponse> {
	return requestJson<ListApprovedLeaveRequestsResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/leaves/approved`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * validateLeaveRequest calls POST /leaves/validate.
 */
export function validateLeaveRequest(request: ValidateLeaveRequest): Promise<ValidateLeaveResponse> {
	return requestJson<ValidateLeaveResponse>('/leaves/validate', {
		method: 'POST',
		body: request,
	});
}

/**
 * createLeaveRequest calls POST /leaves.
 */
export function createLeaveRequest(request: CreateLeaveRequest): Promise<CreateLeaveResponse> {
	return requestJson<CreateLeaveResponse>('/leaves', {
		method: 'POST',
		body: request,
	});
}

/**
 * updateLeaveRequest calls PUT /leaves/{leaveRequestID}.
 */
export function updateLeaveRequest(
	leaveRequestID: string,
	request: UpdateLeaveRequest,
): Promise<UpdateLeaveResponse> {
	return requestJson<UpdateLeaveResponse>(`/leaves/${encodePath(leaveRequestID)}`, {
		method: 'PUT',
		body: request,
	});
}


/**
 * createLeaveChangeRequest calls POST /leaves/{leaveRequestID}/change-requests.
 */
export function createLeaveChangeRequest(
	leaveRequestID: string,
	request: CreateLeaveChangeRequest,
): Promise<CreateLeaveChangeResponse> {
	return requestJson<CreateLeaveChangeResponse>(`/leaves/${encodePath(leaveRequestID)}/change-requests`, {
		method: 'POST',
		body: request,
	});
}


/**
 * createLeaveDeletionRequest calls POST /leaves/{leaveRequestID}/delete-requests.
 */
export function createLeaveDeletionRequest(
	leaveRequestID: string,
	request: CreateLeaveDeletionRequest,
): Promise<CreateLeaveDeletionResponse> {
	return requestJson<CreateLeaveDeletionResponse>(`/leaves/${encodePath(leaveRequestID)}/delete-requests`, {
		method: 'POST',
		body: request,
	});
}

/**
 * decideLeaveRequest calls POST /leaves/{leaveRequestID}/decision.
 */
export function decideLeaveRequest(leaveRequestID: string, request: DecideLeaveRequest): Promise<DecideLeaveResponse> {
	return requestJson<DecideLeaveResponse>(`/leaves/${encodePath(leaveRequestID)}/decision`, {
		method: 'POST',
		body: request,
	});
}


/**
 * decideLeaveChangeRequest calls POST /leaves/change-requests/{changeRequestID}/decision.
 */
export function decideLeaveChangeRequest(
	changeRequestID: string,
	request: DecideLeaveChangeRequest,
): Promise<DecideLeaveChangeResponse> {
	return requestJson<DecideLeaveChangeResponse>(`/leaves/change-requests/${encodePath(changeRequestID)}/decision`, {
		method: 'POST',
		body: request,
	});
}

/**
 * cancelLeaveRequest calls POST /leaves/{leaveRequestID}/cancel.
 */
export function cancelLeaveRequest(leaveRequestID: string): Promise<CancelLeaveRequestResponse> {
	return requestJson<CancelLeaveRequestResponse>(`/leaves/${encodePath(leaveRequestID)}/cancel`, {
		method: 'POST',
	});
}