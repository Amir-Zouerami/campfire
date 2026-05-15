import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, decideLeaveRequest, listPendingLeaveRequests } from '../api/client';
import type { PendingLeaveRequest, Workspace } from '../types/domain';

/**
 * LeaveApprovalsCardProps contains the workspace used for approval lists.
 */
type LeaveApprovalsCardProps = {
	readonly workspace: Workspace;
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
	}, [props.workspace.id]);

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
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving';

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-emerald-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-emerald-200">
						Approvals
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Pending leave requests
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Review leave requests for this workspace. Requesters receive a Campfire DM when you approve or
						reject.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-200">
					{leaveRequests.length} pending
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading pending leave requests…</p>}

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<p className="cf:m-0 cf:text-slate-300">No pending leave requests.</p>
				)}

				{leaveRequests.map(item => (
					<article
						className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={item.leaveRequest.id}
					>
						<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
							<div>
								<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
									{item.leaveTypeName}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
									{item.leaveRequest.startDate} → {item.leaveRequest.endDate}
									{formatDurationDetails(item)}
								</p>
								<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
									Requested by {item.leaveRequest.userId}
								</p>
							</div>

							<span className="cf:w-fit cf:rounded-full cf:border cf:border-amber-300/20 cf:bg-amber-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-amber-200">
								{item.leaveRequest.status}
							</span>
						</div>

						{item.leaveRequest.reason !== '' && (
							<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-200">
								{item.leaveRequest.reason}
							</p>
						)}

						<label className="cf:mt-4 cf:grid cf:gap-2">
							<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-emerald-200">
								Decision comment
							</span>
							<textarea
								className="cf:min-h-20 cf:w-full cf:resize-y cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:placeholder:text-slate-500 cf:focus:border-emerald-300/60 cf:focus:ring-4 cf:focus:ring-emerald-300/15 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
								value={comments[item.leaveRequest.id] ?? ''}
								placeholder="Optional note to the requester..."
								disabled={isBusy}
								onChange={event => {
									const value = event.currentTarget.value;
									setComments(current => ({
										...current,
										[item.leaveRequest.id]: value,
									}));
								}}
							/>
						</label>

						<div className="cf:mt-4 cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row">
							<button
								className="cf:w-fit cf:rounded-2xl cf:border cf:border-emerald-300/25 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
								type="button"
								disabled={isBusy}
								onClick={() => void handleDecision(item.leaveRequest.id, 'approved')}
							>
								Approve
							</button>

							<button
								className="cf:w-fit cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-400/15 cf:px-5 cf:py-3 cf:font-black cf:text-red-50 cf:transition cf:hover:bg-red-400/25 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
								type="button"
								disabled={isBusy}
								onClick={() => void handleDecision(item.leaveRequest.id, 'rejected')}
							>
								Reject
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

/**
 * formatDurationDetails returns compact duration-specific display text.
 */
function formatDurationDetails(item: PendingLeaveRequest): string {
	const request = item.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? ' · half day' : ` · half day · ${request.halfDayPart}`;

		case 'hourly':
			return ` · ${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return '';

		default:
			return '';
	}
}

/**
 * removeComment removes one decision comment from the keyed comment state.
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
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update pending leave request.';
}
