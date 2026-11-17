import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelLeaveRequest, listApprovedLeaveRequests, updateLeaveRequest } from '@/shared/api';
import { leaveKeys } from '@/shared/data/leave';
import type { DateRange } from '@/shared/lib/date';
import { useWorkspaceID } from '@/shared/session';
import type { UpdateLeaveRequest } from '@/shared/types/api';

import { isValidRange } from './availability';

/**
 * useApprovedLeave loads approved leave overlapping a planning window.
 */
export function useApprovedLeave(range: DateRange) {
	const workspaceID = useWorkspaceID();

	return useQuery({
		queryKey: leaveKeys.approved(workspaceID, range.startDate, range.endDate),
		queryFn: async () => (await listApprovedLeaveRequests(workspaceID, range.startDate, range.endDate)).leaveRequests,
		enabled: isValidRange(range),
		staleTime: 30_000,
	});
}

/**
 * useLeaveCorrections lets approvers correct or remove approved leave. Correction is direct
 * (no change request), unlike a member editing their own approved leave.
 */
export function useLeaveCorrections() {
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: leaveKeys.all(workspaceID) });

	const correct = useMutation({
		mutationFn: (input: { readonly leaveRequestID: string; readonly request: UpdateLeaveRequest }) =>
			updateLeaveRequest(input.leaveRequestID, input.request),
		onSuccess: refresh,
	});

	const remove = useMutation({
		mutationFn: cancelLeaveRequest,
		onSuccess: refresh,
	});

	return { correct, remove };
}
