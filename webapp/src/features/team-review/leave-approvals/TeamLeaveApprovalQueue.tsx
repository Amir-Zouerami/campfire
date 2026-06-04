import type { ReactElement } from 'react';
import { MessageSquareText, ThumbsDown, ThumbsUp, Umbrella } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
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
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * TeamLeaveApprovalQueueProps contains pending leave requests and decision actions.
 */
type TeamLeaveApprovalQueueProps = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly comments: Readonly<Record<string, string>>;
	readonly disabled: boolean;
	readonly timezone: string;
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
		<div className="campfire-approval-queue">
			{props.leaveRequests.map(item => (
				<TeamLeaveApprovalCard
					key={item.leaveRequest.id}
					item={item}
					comment={props.comments[item.leaveRequest.id] ?? ''}
					disabled={props.disabled}
					timezone={props.timezone}
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
	readonly timezone: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (comment: string) => void;
	readonly onDecision: (decision: LeaveDecision) => Promise<void>;
}): ReactElement {
	const request = props.item.leaveRequest;
	const requesterLabel = props.labelForUserID(request.userId);
	const backupLabel = request.backupUserId.trim() === '' ? 'Not set' : props.labelForUserID(request.backupUserId);

	return (
		<article className={approvalCardClassName()}>
			<header className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-4">
				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-[0.78rem] cf:font-semibold cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100/90">
						{requesterLabel}
					</p>
					<h3 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-semibold cf:leading-tight cf:tracking-[-0.035em] cf:text-foreground">
						{props.item.leaveTypeName}
					</h3>
				</div>

				<CampfireStatusPill tone={leaveStatusTone(request.status)}>
					{formatLeaveStatus(request.status)}
				</CampfireStatusPill>
			</header>

			<div className="campfire-approval-detail-grid">
				<ApprovalDetail label="Date range" value={approvalRangeLabel(request)} />
				<ApprovalDetail label="Duration" value={approvalDurationLabel(request)} />
				<ApprovalDetail label="Mode" value={formatDurationMode(request.durationMode)} />
				<ApprovalDetail label="Backup" value={backupLabel} />
				<ApprovalDetail label="Requested" value={formatWorkspaceDateTime(request.createdAt, props.timezone)} />
			</div>

			{request.reason.trim() !== '' && (
				<section className="campfire-approval-note-panel">
					<p className="campfire-approval-field-label">Reason</p>
					<p className="cf:m-0 cf:mt-2 cf:whitespace-pre-wrap cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-200">
						{request.reason}
					</p>
				</section>
			)}

			<section className="campfire-approval-comment-block">
				<label htmlFor={`campfire-approval-comment-${request.id}`} className="campfire-approval-comment-label">
					<MessageSquareText className="campfire-approval-comment-icon" aria-hidden="true" />
					<span>Approver comment</span>
				</label>

				<CampfireResponsiveTextarea
					id={`campfire-approval-comment-${request.id}`}
					disabled={props.disabled}
					placeholder="Optional comment. Strongly recommended when rejecting."
					value={props.comment}
					onValueChange={props.onCommentChange}
				/>
			</section>

			<footer className="cf:flex cf:flex-wrap cf:justify-end cf:gap-3 cf:pt-1">
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
			</footer>
		</article>
	);
}

/**
 * ApprovalDetail renders one approval metadata tile.
 */
function ApprovalDetail(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="campfire-approval-detail-tile">
			<p className="campfire-approval-field-label">{props.label}</p>
			<p className="campfire-approval-detail-value" title={props.value}>
				{props.value}
			</p>
		</div>
	);
}

/**
 * formatWorkspaceDateTime renders an API UTC timestamp in the workspace timezone.
 */
function formatWorkspaceDateTime(value: string, timezone: string): string {
	const cleanValue = value.trim();
	if (cleanValue === '') {
		return 'Unknown';
	}

	const date = new Date(cleanValue);
	if (Number.isNaN(date.getTime())) {
		return cleanValue;
	}

	const cleanTimezone = timezone.trim();

	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: cleanTimezone === '' ? undefined : cleanTimezone,
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(date);
	}
}