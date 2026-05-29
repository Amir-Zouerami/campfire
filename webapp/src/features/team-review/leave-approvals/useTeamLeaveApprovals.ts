import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import { decideLeaveRequest, listPendingLeaveRequests } from '@/api';
import type { PendingLeaveRequest, Workspace } from '@/types/domain';

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
	readonly comments: LeaveDecisionComments;
	readonly message: string;
	readonly isBusy: boolean;
	readonly pendingCount: number;
	readonly userIDsForProfiles: readonly string[];
	readonly updateComment: (leaveRequestID: string, comment: string) => void;
	readonly decide: (leaveRequestID: string, decision: LeaveDecision) => Promise<void>;
};

/**
 * useTeamLeaveApprovals owns pending leave approval loading and decisions.
 */
export function useTeamLeaveApprovals(input: UseTeamLeaveApprovalsInput): UseTeamLeaveApprovalsResult {
	const [loadState, setLoadState] = useState<TeamLeaveApprovalLoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly PendingLeaveRequest[]>([]);
	const [comments, setComments] = useState<LeaveDecisionComments>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadPendingLeaves loads the approval queue for approvers.
		 */
		async function loadPendingLeaves(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listPendingLeaveRequests(input.workspace.id);

				if (!isActive) {
					return;
				}

				setLeaveRequests(response.leaveRequests);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				if (errorIsPermissionDenied(error)) {
					setLoadState('hidden');
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadPendingLeaves();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken]);

	const userIDsForProfiles = useMemo(() => {
		return collectLeaveApprovalUserIDs(leaveRequests);
	}, [leaveRequests]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

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
		setLoadState('saving');
		setMessage('');

		try {
			await decideLeaveRequest(leaveRequestID, {
				decision,
				comment: comments[leaveRequestID] ?? '',
			});

			setLeaveRequests(current => current.filter(item => item.leaveRequest.id !== leaveRequestID));
			setComments(current => removeComment(current, leaveRequestID));
			setLoadState('ready');
			setMessage(decision === 'approved' ? 'Leave request approved.' : 'Leave request rejected.');
			toast.success(decision === 'approved' ? 'Leave approved' : 'Leave rejected');
			input.onLeaveDecided();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		leaveRequests,
		comments,
		message,
		isBusy,
		pendingCount: leaveRequests.length,
		userIDsForProfiles,
		updateComment,
		decide,
	};
}

/**
 * removeComment removes one request comment from the comment map.
 */
function removeComment(comments: LeaveDecisionComments, leaveRequestID: string): LeaveDecisionComments {
	const nextComments: Record<string, string> = { ...comments };
	delete nextComments[leaveRequestID];

	return nextComments;
}