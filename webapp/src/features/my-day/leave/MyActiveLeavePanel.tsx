import type { ReactElement } from 'react';
import { Ban, Umbrella } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import type { PendingLeaveRequest } from '@/types/domain';

import { formatLeaveDurationDetails, formatLeaveRange, formatLeaveStatus, leaveStatusTone } from './my-leave.helpers';

/**
 * MyActiveLeavePanelProps contains the current user's active leave requests.
 */
type MyActiveLeavePanelProps = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly disabled: boolean;
	readonly onCancel: (leaveRequestId: string) => Promise<void>;
};

/**
 * MyActiveLeavePanel renders the current user's pending and approved leave requests.
 */
export function MyActiveLeavePanel(props: MyActiveLeavePanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					My active leave
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Pending and approved requests
				</h3>
			</div>

			{props.leaveRequests.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title="No active leave"
					description="Pending and approved leave requests will appear here."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.leaveRequests.map(item => (
						<ActiveLeaveRow
							key={item.leaveRequest.id}
							item={item}
							disabled={props.disabled}
							onCancel={() => props.onCancel(item.leaveRequest.id)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * ActiveLeaveRow renders one personal leave request.
 */
function ActiveLeaveRow(props: {
	readonly item: PendingLeaveRequest;
	readonly disabled: boolean;
	readonly onCancel: () => Promise<void>;
}): ReactElement {
	const request = props.item.leaveRequest;

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-black cf:text-foreground">
						{props.item.leaveTypeName}
					</h4>
					<CampfireStatusPill tone={leaveStatusTone(request.status)}>
						{formatLeaveStatus(request.status)}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					{formatLeaveRange(request)} · {formatLeaveDurationDetails(request)}
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<LeaveMetaChip label="Backup" value={request.backupUserId} />
					<LeaveMetaChip label="Reason" value={request.reason} />
				</div>
			</div>

			<div className="cf:flex cf:items-start cf:justify-end">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onCancel()}
				>
					<Ban className="cf:size-4" />
					Cancel
				</Button>
			</div>
		</article>
	);
}

/**
 * LeaveMetaChip renders optional leave metadata.
 */
function LeaveMetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}
