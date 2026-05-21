import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, ThumbsDown, ThumbsUp, Umbrella } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, decideLeaveRequest, listPendingLeaveRequests } from '@/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PendingLeaveRequest, Workspace } from '@/types/domain';

import { CampfireCardBody, CampfireCardHeader, CampfireEmpty, CampfirePanel, CampfireStatusPill } from './campfire-ui';
import { useUserProfiles } from './useUserProfiles';

/**
 * LeaveApprovalsCardProps contains the workspace used for approval lists.
 */
type LeaveApprovalsCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
	readonly onLeaveDecided: () => void;
};

/**
 * LoadState describes the approval panel loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'hidden' | 'error';

/**
 * DecisionState stores comments keyed by leave request ID.
 */
type DecisionState = Readonly<Record<string, string>>;

/**
 * LeaveApprovalsCard renders pending leave approvals for workspace approvers.
 */
export function LeaveApprovalsCard(props: LeaveApprovalsCardProps): ReactElement | null {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly PendingLeaveRequest[]>([]);
	const [comments, setComments] = useState<DecisionState>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads pending leaves for approvers.
		 */
		async function loadPendingLeaves(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listPendingLeaveRequests(props.workspace.id);

				if (!isActive) {
					return;
				}

				setLeaveRequests(response.leaveRequests);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				if (error instanceof ApiClientError && error.code === 'permission_denied') {
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
	}, [props.workspace.id, props.refreshToken]);

	const userIDsForProfiles = useMemo(() => collectLeaveUserIDs(leaveRequests), [leaveRequests]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	if (loadState === 'hidden') {
		return null;
	}

	/**
	 * Applies an approval decision.
	 */
	async function handleDecision(leaveRequestID: string, decision: 'approved' | 'rejected'): Promise<void> {
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
			toast.success(decision === 'approved' ? 'Leave request approved' : 'Leave request rejected');
			props.onLeaveDecided();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving';

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Approvals"
				title="Pending leave requests"
				description="Review leave requests for this workspace. Requesters receive a Campfire DM when you approve or reject."
				icon={Umbrella}
				action={<CampfireStatusPill tone="ember">{leaveRequests.length} pending</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving requester names…" />}
				{loadState === 'loading' && <LoadingRow label="Loading pending leave requests…" />}

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<CampfireEmpty
						icon={CheckCircle2}
						title="No pending approvals"
						description="You are all caught up. New leave requests will appear here."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{leaveRequests.map(item => (
						<ApprovalRow
							key={item.leaveRequest.id}
							item={item}
							comment={comments[item.leaveRequest.id] ?? ''}
							isBusy={isBusy}
							labelForUserID={labelForUserID}
							onCommentChange={comment =>
								setComments(current => ({ ...current, [item.leaveRequest.id]: comment }))
							}
							onApprove={() => void handleDecision(item.leaveRequest.id, 'approved')}
							onReject={() => void handleDecision(item.leaveRequest.id, 'rejected')}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * ApprovalRow renders one leave approval item.
 */
function ApprovalRow(props: {
	readonly item: PendingLeaveRequest;
	readonly comment: string;
	readonly isBusy: boolean;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (comment: string) => void;
	readonly onApprove: () => void;
	readonly onReject: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_20rem]">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong
							className="cf:text-lg cf:font-black cf:text-white"
							title={props.item.leaveRequest.userId}
						>
							{props.labelForUserID(props.item.leaveRequest.userId)}
						</strong>
						<CampfireStatusPill tone="ember">{props.item.leaveTypeName}</CampfireStatusPill>
					</div>

					<p className="cf:mt-3 cf:text-sm cf:font-bold cf:text-slate-300">
						{props.item.leaveRequest.startDate} → {props.item.leaveRequest.endDate}
						{formatDurationDetails(props.item)}
					</p>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<MetaChip label="Mode" value={formatLabel(props.item.leaveRequest.durationMode)} />
						<MetaChip
							label="Backup"
							value={backupLabel(props.item.leaveRequest.backupUserId, props.labelForUserID)}
						/>
					</div>

					{props.item.leaveRequest.reason !== '' && (
						<p className="cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-200">
							{props.item.leaveRequest.reason}
						</p>
					)}
				</div>

				<div className="cf:grid cf:gap-3">
					<div className="cf:flex cf:items-center cf:gap-2 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
						<MessageSquareText className="cf:size-4" />
						Decision comment
					</div>
					<Textarea
						className="cf:min-h-28"
						disabled={props.isBusy}
						placeholder="Optional approval/rejection note..."
						value={props.comment}
						onChange={event => props.onCommentChange(event.currentTarget.value)}
					/>
					<div className="cf:grid cf:grid-cols-2 cf:gap-2">
						<Button type="button" disabled={props.isBusy} onClick={props.onApprove}>
							<ThumbsUp className="cf:size-4" />
							Approve
						</Button>
						<Button type="button" variant="destructive" disabled={props.isBusy} onClick={props.onReject}>
							<ThumbsDown className="cf:size-4" />
							Reject
						</Button>
					</div>
				</div>
			</div>
		</article>
	);
}

/**
 * MetaChip renders optional row metadata.
 */
function MetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/5 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * MessageRow renders a status or error row.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={
				isError
					? 'cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100'
					: 'cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-amber-100'
			}
		>
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * collectLeaveUserIDs returns user IDs referenced by leave approval rows.
 */
function collectLeaveUserIDs(leaveRequests: readonly PendingLeaveRequest[]): readonly string[] {
	const userIDs: string[] = [];

	for (const item of leaveRequests) {
		userIDs.push(item.leaveRequest.userId);

		if (item.leaveRequest.backupUserId.trim() !== '') {
			userIDs.push(item.leaveRequest.backupUserId);
		}
	}

	return userIDs;
}

/**
 * removeComment removes one comment from the keyed state.
 */
function removeComment(comments: DecisionState, leaveRequestID: string): DecisionState {
	const nextComments: Record<string, string> = {};

	for (const [key, value] of Object.entries(comments)) {
		if (key !== leaveRequestID) {
			nextComments[key] = value;
		}
	}

	return nextComments;
}

/**
 * backupLabel returns a readable backup label.
 */
function backupLabel(backupUserID: string, labelForUserID: (userID: string) => string): string {
	if (backupUserID.trim() === '') {
		return '';
	}

	return labelForUserID(backupUserID);
}

/**
 * formatDurationDetails returns compact duration-specific display text.
 */
function formatDurationDetails(item: PendingLeaveRequest): string {
	const request = item.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? ' · half day' : ` · half day · ${formatLabel(request.halfDayPart)}`;

		case 'hourly':
			return ` · ${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return '';

		default:
			return '';
	}
}

/**
 * formatLabel converts enum-like strings to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update leave approval.';
}
