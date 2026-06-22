import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelLeaveRequest, decideLeaveChangeRequest, decideLeaveRequest, listPendingLeaveChangeRequests, listPendingLeaveRequests } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { PendingLeaveChangeRequest, PendingLeaveRequest, Workspace } from '@/types/domain';

import { collectLeaveApprovalUserIDs, errorIsPermissionDenied, errorToMessage } from './team-leave-approvals.helpers';
import type { LeaveDecision, LeaveDecisionComments, TeamLeaveApprovalLoadState } from './team-leave-approvals.types';

/**
 * UseTeamLeaveApprovalsInput contains workspace context and refresh callbacks.
 */
type UseTeamLeaveApprovalsInput = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
	readonly onLeaveDecided: () => void;
};

/**
 * UseTeamLeaveApprovalsResult contains approval queue state and actions.
 */
export type UseTeamLeaveApprovalsResult = {
	readonly loadState: TeamLeaveApprovalLoadState;
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly changeRequests: readonly PendingLeaveChangeRequest[];
	readonly comments: LeaveDecisionComments;
	readonly message: string;
	readonly isBusy: boolean;
	readonly pendingCount: number;
	readonly userIDsForProfiles: readonly string[];
	readonly updateComment: (leaveRequestID: string, comment: string) => void;
	readonly decide: (leaveRequestID: string, decision: LeaveDecision) => Promise<void>;
	readonly decideChange: (changeRequestID: string, decision: LeaveDecision) => Promise<void>;
	readonly cancelLeaveRequestByID: (leaveRequestID: string) => Promise<void>;
};

/**
 * useTeamLeaveApprovals owns pending leave approval loading and decisions.
 */
export function useTeamLeaveApprovals(input: UseTeamLeaveApprovalsInput): UseTeamLeaveApprovalsResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [comments, setComments] = useState<LeaveDecisionComments>({});

	const approvalsQueryKey = campfireQueryKeys.teamLeaveApprovals(input.workspace.id, input.refreshToken);

	const approvalsQuery = useQuery({
		queryKey: approvalsQueryKey,
		queryFn: async (): Promise<{
			readonly leaveRequests: readonly PendingLeaveRequest[];
			readonly changeRequests: readonly PendingLeaveChangeRequest[];
		}> => {
			const [leaveResponse, changeResponse] = await Promise.all([
				listPendingLeaveRequests(input.workspace.id),
				listPendingLeaveChangeRequests(input.workspace.id),
			]);

			return {
				leaveRequests: leaveResponse.leaveRequests,
				changeRequests: changeResponse.changeRequests,
			};
		},
		retry: (failureCount, error) => !errorIsPermissionDenied(error) && failureCount < 2,
	});

	const decisionMutation = useMutation({
		mutationFn: async (inputValue: { readonly leaveRequestID: string; readonly decision: LeaveDecision }): Promise<void> => {
			await decideLeaveRequest(inputValue.leaveRequestID, {
				decision: inputValue.decision,
				comment: comments[inputValue.leaveRequestID] ?? '',
			});
		},
		onSuccess: async (_response, inputValue) => {
			setComments(current => removeComment(current, inputValue.leaveRequestID));
			queryClient.setQueryData<{
				readonly leaveRequests: readonly PendingLeaveRequest[];
				readonly changeRequests: readonly PendingLeaveChangeRequest[];
			}>(approvalsQueryKey, current => {
				if (current === undefined) {
					return current;
				}

				return {
					...current,
					leaveRequests: current.leaveRequests.filter(item => item.leaveRequest.id !== inputValue.leaveRequestID),
				};
			});
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.teamReview(input.workspace.id) });
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(input.workspace.id) });
			input.onLeaveDecided();
		},
	});

	const cancelMutation = useMutation({
		mutationFn: cancelLeaveRequest,
		onSuccess: async (_response, leaveRequestID) => {
			setComments(current => removeComment(current, leaveRequestID));
			queryClient.setQueryData<{
				readonly leaveRequests: readonly PendingLeaveRequest[];
				readonly changeRequests: readonly PendingLeaveChangeRequest[];
			}>(approvalsQueryKey, current => {
				if (current === undefined) {
					return current;
				}

				return {
					...current,
					leaveRequests: current.leaveRequests.filter(item => item.leaveRequest.id !== leaveRequestID),
				};
			});
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.teamReview(input.workspace.id) });
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(input.workspace.id) });
			input.onLeaveDecided();
		},
	});

	const changeDecisionMutation = useMutation({
		mutationFn: async (inputValue: { readonly changeRequestID: string; readonly decision: LeaveDecision }): Promise<void> => {
			await decideLeaveChangeRequest(inputValue.changeRequestID, {
				decision: inputValue.decision,
				comment: comments[inputValue.changeRequestID] ?? '',
			});
		},
		onSuccess: async (_response, inputValue) => {
			setComments(current => removeComment(current, inputValue.changeRequestID));
			queryClient.setQueryData<{
				readonly leaveRequests: readonly PendingLeaveRequest[];
				readonly changeRequests: readonly PendingLeaveChangeRequest[];
			}>(approvalsQueryKey, current => {
				if (current === undefined) {
					return current;
				}

				return {
					...current,
					changeRequests: current.changeRequests.filter(item => item.changeRequest.id !== inputValue.changeRequestID),
				};
			});
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.teamReview(input.workspace.id) });
			await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(input.workspace.id) });
			input.onLeaveDecided();
		},
	});

	const leaveRequests = approvalsQuery.data?.leaveRequests ?? [];
	const changeRequests = approvalsQuery.data?.changeRequests ?? [];
	const userIDsForProfiles = useMemo(() => {
		return collectLeaveApprovalUserIDs(leaveRequests, changeRequests);
	}, [changeRequests, leaveRequests]);
	const loadState = resolveTeamLeaveApprovalLoadState(
		approvalsQuery.isLoading,
		approvalsQuery.error,
		decisionMutation.isPending || changeDecisionMutation.isPending || cancelMutation.isPending,
	);
	const message = resolveTeamLeaveApprovalMessage(
		loadState,
		approvalsQuery.error,
		decisionMutation.error ?? changeDecisionMutation.error ?? cancelMutation.error,
		t('teamReview.approvals.error.fallback'),
	);
	const isBusy = approvalsQuery.isFetching || decisionMutation.isPending || changeDecisionMutation.isPending || cancelMutation.isPending;

	/**
	 * updateComment updates the approver comment for one request.
	 */
	function updateComment(leaveRequestID: string, comment: string): void {
		setComments(current => ({
			...current,
			[leaveRequestID]: comment,
		}));
	}

	/**
	 * decide approves or rejects one leave request.
	 */
	async function decide(leaveRequestID: string, decision: LeaveDecision): Promise<void> {
		try {
			await decisionMutation.mutateAsync({ leaveRequestID, decision });
			const toastMessage = decision === 'approved'
				? t('teamReview.approvals.toast.approved')
				: t('teamReview.approvals.toast.rejected');
			toast.success(toastMessage);
		} catch (error: unknown) {
			toast.error(errorToMessage(error, t('teamReview.approvals.error.fallback')));
		}
	}


	/**
	 * decideChange approves or rejects one requested leave edit.
	 */
	async function decideChange(changeRequestID: string, decision: LeaveDecision): Promise<void> {
		try {
			await changeDecisionMutation.mutateAsync({ changeRequestID, decision });
			const toastMessage = decision === 'approved'
				? t('teamReview.approvals.toast.changeApproved')
				: t('teamReview.approvals.toast.changeRejected');
			toast.success(toastMessage);
		} catch (error: unknown) {
			toast.error(errorToMessage(error, t('teamReview.approvals.error.fallback')));
		}
	}

	/**
	 * cancelLeaveRequestByID cancels one pending leave request from the approval queue.
	 */
	async function cancelLeaveRequestByID(leaveRequestID: string): Promise<void> {
		try {
			await cancelMutation.mutateAsync(leaveRequestID);
			toast.success(t('myDay.leave.toast.cancelled'));
		} catch (error: unknown) {
			toast.error(errorToMessage(error, t('teamReview.approvals.error.fallback')));
		}
	}

	return {
		loadState,
		leaveRequests,
		changeRequests,
		comments,
		message,
		isBusy,
		pendingCount: leaveRequests.length + changeRequests.length,
		userIDsForProfiles,
		updateComment,
		decide,
		decideChange,
		cancelLeaveRequestByID,
	};
}

/**
 * resolveTeamLeaveApprovalLoadState maps query/mutation state to workflow state.
 */
function resolveTeamLeaveApprovalLoadState(
	isLoading: boolean,
	queryError: unknown,
	isSaving: boolean,
): TeamLeaveApprovalLoadState {
	if (errorIsPermissionDenied(queryError)) {
		return 'hidden';
	}

	if (isSaving) {
		return 'saving';
	}

	if (isLoading) {
		return 'loading';
	}

	if (queryError !== null) {
		return 'error';
	}

	return 'ready';
}

/**
 * resolveTeamLeaveApprovalMessage returns a localized error or success message.
 */
function resolveTeamLeaveApprovalMessage(
	loadState: TeamLeaveApprovalLoadState,
	queryError: unknown,
	mutationError: unknown,
	fallbackMessage: string,
): string {
	if (loadState === 'error') {
		return errorToMessage(queryError, fallbackMessage);
	}

	if (mutationError !== null) {
		return errorToMessage(mutationError, fallbackMessage);
	}

	return '';
}

/**
 * removeComment removes one request comment from the comment map.
 */
function removeComment(comments: LeaveDecisionComments, leaveRequestID: string): LeaveDecisionComments {
	const nextComments: Record<string, string> = { ...comments };
	delete nextComments[leaveRequestID];

	return nextComments;
}