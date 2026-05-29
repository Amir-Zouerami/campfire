import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import type { ApprovedLeaveRequest } from '@/types/domain';

import { formatLeaveDuration, formatLeaveRange } from './team-runtime.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * TeamRuntimeLeavePanelProps contains approved leave rows used by runtime evaluation.
 */
type TeamRuntimeLeavePanelProps = {
	readonly approvedLeaves: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamRuntimeLeavePanel renders approved leave rows that affect runtime decisions.
 */
export function TeamRuntimeLeavePanel(props: TeamRuntimeLeavePanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Approved leave
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Members skipped from reminders and missing lists
				</h3>
			</div>

			{props.approvedLeaves.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title="No approved leave"
					description="No approved leave requests overlap the selected runtime date."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.approvedLeaves.map(row => (
						<RuntimeLeaveRow key={row.leaveRequest.id} row={row} labelForUserID={props.labelForUserID} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * RuntimeLeaveRow renders one approved leave row used by runtime.
 */
function RuntimeLeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const request = props.row.leaveRequest;
	const backupLabel = request.backupUserId.trim() === '' ? 'Not set' : props.labelForUserID(request.backupUserId);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<strong className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						{props.labelForUserID(request.userId)}
					</strong>
					<CampfireStatusPill tone="green">Approved</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					{props.row.leaveTypeName} · {formatLeaveRange(props.row)} · {formatLeaveDuration(props.row)}
				</p>

				<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-400">Backup: {backupLabel}</p>
			</div>

			<CampfireStatusPill tone="slate">
				<Umbrella className="cf:size-3.5" />
				Runtime input
			</CampfireStatusPill>
		</article>
	);
}
