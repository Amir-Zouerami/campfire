import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

import {
	cancelLeaveRequest,
	decideLeaveChangeRequest,
	decideLeaveRequest,
	listPendingLeaveChangeRequests,
	listPendingLeaveRequests,
} from '@/shared/api';
import { leaveKeys } from '@/shared/data/leave';
import { useWorkspaceID } from '@/shared/session';

import { approvalItems } from './approvalItems';
import type { ApprovalItem } from './approvalItems';

type Decision = 'approved' | 'rejected';

/**
 * usePendingApprovals loads both approval queues and merges them into one list.
 */
export function usePendingApprovals() {
	const workspaceID = useWorkspaceID();
	const [requests, changes] = useQueries({
		queries: [
			{
				queryKey: leaveKeys.pending(workspaceID),
				queryFn: async () => (await listPendingLeaveRequests(workspaceID)).leaveRequests,
				staleTime: 15_000,
			},
			{
				queryKey: leaveKeys.changeRequests(workspaceID),
				queryFn: async () => (await listPendingLeaveChangeRequests(workspaceID)).changeRequests,
				staleTime: 15_000,
			},
		],
	});

	return {
		isPending: requests.isPending || changes.isPending,
		error: requests.error ?? changes.error,
		items: approvalItems(requests.data ?? [], changes.data ?? []),
		refetch: () => Promise.all([requests.refetch(), changes.refetch()]),
	};
}

/**
 * useApprovalDecisions returns the mutations that decide, or delete, a pending item.
 * The server sends the requester their decision message and announces approved leave in the
 * workspace channel, so the frontend only calls the endpoint and refreshes.
 */
export function useApprovalDecisions() {
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: leaveKeys.all(workspaceID) });

	const decide = useMutation({
		mutationFn: (input: { readonly item: ApprovalItem; readonly decision: Decision; readonly comment: string }) =>
			input.item.kind === 'new'
				? decideLeaveRequest(input.item.decisionID, { decision: input.decision, comment: input.comment })
				: decideLeaveChangeRequest(input.item.decisionID, { decision: input.decision, comment: input.comment }),
		onSuccess: refresh,
	});

	const remove = useMutation({
		mutationFn: (leaveRequestID: string) => cancelLeaveRequest(leaveRequestID),
		onSuccess: refresh,
	});

	return { decide, remove };
}
