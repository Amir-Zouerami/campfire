import type {
	CancelLeaveRequestResponse,
	CreateLeaveRequest,
	CreateLeaveResponse,
	DecideLeaveRequest,
	DecideLeaveResponse,
	ListApprovedLeaveRequestsResponse,
	ListLeaveTypesResponse,
	ListMyActiveLeaveRequestsResponse,
	ListMyPendingLeaveRequestsResponse,
	ListPendingLeaveRequestsResponse,
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
 * decideLeaveRequest calls POST /leaves/{leaveRequestID}/decision.
 */
export function decideLeaveRequest(leaveRequestID: string, request: DecideLeaveRequest): Promise<DecideLeaveResponse> {
	return requestJson<DecideLeaveResponse>(`/leaves/${encodePath(leaveRequestID)}/decision`, {
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
