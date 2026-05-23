import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import type { ApprovedLeaveRequest } from '@/types/domain';

import { formatLeaveDuration, formatLeaveRange } from './team-availability.helpers';

/**
 * TeamAvailabilityTablePanelProps contains approved leave rows for the selected range.
 */
type TeamAvailabilityTablePanelProps = {
	readonly rows: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamAvailabilityTablePanel renders the selected range's approved leave rows.
 */
export function TeamAvailabilityTablePanel(props: TeamAvailabilityTablePanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Planning window
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Approved leave rows
				</h3>
			</div>

			{props.rows.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title="No approved leave in this range"
					description="Approved leave requests will appear here when they overlap the selected date window."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.rows.map(row => (
						<AvailabilityRow key={row.leaveRequest.id} row={row} labelForUserID={props.labelForUserID} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * AvailabilityRow renders one approved leave row.
 */
function AvailabilityRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const request = props.row.leaveRequest;
	const backupLabel = request.backupUserId.trim() === '' ? 'Not set' : props.labelForUserID(request.backupUserId);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_12rem]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-black cf:text-foreground">
						{props.labelForUserID(request.userId)}
					</h4>
					<CampfireStatusPill tone="green">Approved</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					{props.row.leaveTypeName} · {formatLeaveRange(request)}
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<AvailabilityChip label="Duration" value={formatLeaveDuration(request)} />
					<AvailabilityChip label="Backup" value={backupLabel} />
				</div>
			</div>

			<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3">
				<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">Created</p>
				<p className="cf:mt-1 cf:truncate cf:text-sm cf:font-bold cf:text-slate-200" title={request.createdAt}>
					{request.createdAt}
				</p>
			</div>
		</article>
	);
}

/**
 * AvailabilityChip renders compact availability metadata.
 */
function AvailabilityChip(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}
