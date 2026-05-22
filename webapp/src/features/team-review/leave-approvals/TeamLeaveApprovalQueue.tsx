import type { ReactElement } from 'react';
import { MessageSquareText, ThumbsDown, ThumbsUp, Umbrella } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PendingLeaveRequest } from '@/types/domain';

import {
	approvalCardClassName,
	approvalDurationLabel,
	approvalRangeLabel,
	formatDurationMode,
	formatLeaveStatus,
	leaveStatusTone,
} from './team-leave-approvals.helpers';
import type { LeaveDecision } from './team-leave-approvals.types';

/**
 * TeamLeaveApprovalQueueProps contains pending leave requests and decision actions.
 */
type TeamLeaveApprovalQueueProps = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly comments: Readonly<Record<string, string>>;
	readonly disabled: boolean;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (leaveRequestID: string, comment: string) => void;
	readonly onDecision: (leaveRequestID: string, decision: LeaveDecision) => Promise<void>;
};

/**
 * TeamLeaveApprovalQueue renders pending leave approval cards.
 */
export function TeamLeaveApprovalQueue(props: TeamLeaveApprovalQueueProps): ReactElement {
	if (props.leaveRequests.length === 0) {
		return (
			<CampfireEmpty
				icon={Umbrella}
				title="No pending leave requests"
				description="New leave requests that require approval will appear here."
			/>
		);
	}

	return (
		<div className="cf:grid cf:gap-4">
			{props.leaveRequests.map(item => (
				<TeamLeaveApprovalCard
					key={item.leaveRequest.id}
					item={item}
					comment={props.comments[item.leaveRequest.id] ?? ''}
					disabled={props.disabled}
					labelForUserID={props.labelForUserID}
					onCommentChange={comment => props.onCommentChange(item.leaveRequest.id, comment)}
					onDecision={decision => props.onDecision(item.leaveRequest.id, decision)}
				/>
			))}
		</div>
	);
}

/**
 * TeamLeaveApprovalCard renders one pending leave request.
 */
function TeamLeaveApprovalCard(props: {
	readonly item: PendingLeaveRequest;
	readonly comment: string;
	readonly disabled: boolean;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (comment: string) => void;
	readonly onDecision: (decision: LeaveDecision) => Promise<void>;
}): ReactElement {
	const request = props.item.leaveRequest;
	const requesterLabel = props.labelForUserID(request.userId);
	const backupLabel = request.backupUserId.trim() === '' ? '' : props.labelForUserID(request.backupUserId);

	return (
		<article className={approvalCardClassName()}>
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-4">
				<div className="cf:min-w-0">
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{requesterLabel}
					</p>
					<h3 className="cf:mt-1 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-foreground">
						{props.item.leaveTypeName}
					</h3>
				</div>

				<CampfireStatusPill tone={leaveStatusTone(request.status)}>
					{formatLeaveStatus(request.status)}
				</CampfireStatusPill>
			</div>

			<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
				<ApprovalDetail label="Date range" value={approvalRangeLabel(request)} />
				<ApprovalDetail label="Duration" value={approvalDurationLabel(request)} />
				<ApprovalDetail label="Mode" value={formatDurationMode(request.durationMode)} />
			</div>

			<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
				<ApprovalDetail label="Backup" value={backupLabel || 'Not set'} />
				<ApprovalDetail label="Requested" value={request.createdAt} />
			</div>

			{request.reason.trim() !== '' && (
				<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">Reason</p>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-slate-200">
						{request.reason}
					</p>
				</div>
			)}

			<div className="cf:grid cf:gap-2">
				<label
					htmlFor={`campfire-approval-comment-${request.id}`}
					className="cf:flex cf:items-center cf:gap-2 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
				>
					<MessageSquareText className="cf:size-4" />
					Approver comment
				</label>
				<Textarea
					id={`campfire-approval-comment-${request.id}`}
					disabled={props.disabled}
					placeholder="Optional comment. Strongly recommended when rejecting."
					value={props.comment}
					onChange={event => props.onCommentChange(event.currentTarget.value)}
				/>
			</div>

			<div className="cf:flex cf:flex-wrap cf:justify-end cf:gap-3">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onDecision('rejected')}
				>
					<ThumbsDown className="cf:size-4" />
					Reject
				</Button>

				<Button type="button" disabled={props.disabled} onClick={() => void props.onDecision('approved')}>
					<ThumbsUp className="cf:size-4" />
					Approve
				</Button>
			</div>
		</article>
	);
}

/**
 * ApprovalDetail renders one compact approval fact.
 */
function ApprovalDetail(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">{props.label}</p>
			<p className="cf:mt-1 cf:truncate cf:text-base cf:font-black cf:text-foreground" title={props.value}>
				{props.value}
			</p>
		</div>
	);
}
