import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2, Trash2, Umbrella } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, cancelLeaveRequest, listMyActiveLeaveRequests } from '@/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { PendingLeaveRequest, Workspace } from '@/types/domain';

import { CampfireCardBody, CampfireCardHeader, CampfireEmpty, CampfirePanel, CampfireStatusPill } from './campfire-ui';

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
 */
export function MyPendingLeavesCard(props: MyPendingLeavesCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly PendingLeaveRequest[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads the current user's active leave requests.
		 */
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
			toast.success('Leave request cancelled');
			props.onLeaveCancelled();
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
				eyebrow="My leaves"
				title="My active leave requests"
				description="Pending and approved requests can be cancelled. Approved cancellations are announced in the channel."
				icon={Umbrella}
				action={<CampfireStatusPill tone="ember">{leaveRequests.length} active</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				{message !== '' && <MessageRow state={loadState} message={message} />}

				{loadState === 'loading' && <LoadingRow label="Loading your active leave requests…" />}

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No active leave requests"
						description="When you request leave, pending and approved requests will show here."
					/>
				)}

				{leaveRequests.length > 0 && <Separator className="cf:bg-white/10" />}

				<div className="cf:grid cf:gap-4">
					{leaveRequests.map(item => (
						<LeaveRequestRow
							item={item}
							isBusy={isBusy}
							onCancel={() => void handleCancel(item.leaveRequest.id)}
							key={item.leaveRequest.id}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * LeaveRequestRow renders one active leave request.
 */
function LeaveRequestRow(props: {
	readonly item: PendingLeaveRequest;
	readonly isBusy: boolean;
	readonly onCancel: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">{props.item.leaveTypeName}</strong>
						<LeaveStatusPill status={props.item.leaveRequest.status} />
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">
						{props.item.leaveRequest.startDate} → {props.item.leaveRequest.endDate}
						{formatDurationDetails(props.item)}
					</p>

					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
						Request {props.item.leaveRequest.id}
					</p>
				</div>

				<Button type="button" variant="destructive" disabled={props.isBusy} onClick={props.onCancel}>
					<Trash2 className="cf:size-4" />
					Cancel request
				</Button>
			</div>

			{props.item.leaveRequest.reason !== '' && (
				<p className="cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-200">
					{props.item.leaveRequest.reason}
				</p>
			)}
		</article>
	);
}

/**
 * LeaveStatusPill renders a leave status chip.
 */
function LeaveStatusPill(props: { readonly status: string }): ReactElement {
	const tone = props.status === 'approved' ? 'green' : props.status === 'pending' ? 'ember' : 'slate';

	return <CampfireStatusPill tone={tone}>{formatLabel(props.status)}</CampfireStatusPill>;
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

	return 'Could not update your leave request.';
}
