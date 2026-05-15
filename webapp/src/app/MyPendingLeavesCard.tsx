import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, cancelLeaveRequest, listMyActiveLeaveRequests } from '../api/client';
import type { PendingLeaveRequest, Workspace } from '../types/domain';

/**
 * MyPendingLeavesCardProps contains workspace and refresh data.
 */
type MyPendingLeavesCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
	readonly onLeaveCancelled: () => void;
};

/**
 * LoadState describes the current-user leave panel loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * MyPendingLeavesCard renders active leave requests created by the current user.
 *
 * Active leave requests are pending or approved requests that can still be cancelled.
 */
export function MyPendingLeavesCard(props: MyPendingLeavesCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly PendingLeaveRequest[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadMyActiveLeaves(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listMyActiveLeaveRequests(props.workspace.id);

				if (!isActive) {
					return;
				}

				setLeaveRequests(response.leaveRequests);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadMyActiveLeaves();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken]);

	/**
	 * Cancels a pending or approved leave request.
	 */
	async function handleCancel(leaveRequestID: string): Promise<void> {
		setLoadState('saving');
		setMessage('');

		try {
			await cancelLeaveRequest(leaveRequestID);

			setLeaveRequests(current => current.filter(item => item.leaveRequest.id !== leaveRequestID));
			setLoadState('ready');
			setMessage('Leave request cancelled.');
			props.onLeaveCancelled();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving';

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-sky-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-sky-200">
						My leaves
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						My active leave requests
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Pending and approved requests can be cancelled. Approved cancellations are announced in the
						channel.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-sky-300/25 cf:bg-sky-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-sky-200">
					{leaveRequests.length} active
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{loadState === 'loading' && (
					<p className="cf:m-0 cf:text-slate-300">Loading your active leave requests…</p>
				)}

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<p className="cf:m-0 cf:text-slate-300">You have no active leave requests.</p>
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
									Request {item.leaveRequest.id}
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

						<div className="cf:mt-4">
							<button
								className="cf:w-fit cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-400/15 cf:px-5 cf:py-3 cf:font-black cf:text-red-50 cf:transition cf:hover:bg-red-400/25 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
								type="button"
								disabled={isBusy}
								onClick={() => void handleCancel(item.leaveRequest.id)}
							>
								Cancel request
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
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update your leave request.';
}
