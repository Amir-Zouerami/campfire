import type { ReactElement } from 'react';
import { CalendarDays, Umbrella } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import type { ApprovedLeaveRequest } from '@/types/domain';

import { formatLeaveDuration, formatLeaveRange } from './team-availability.helpers';

/**
 * TeamAvailabilitySummaryPanelProps contains today/week availability rows.
 */
type TeamAvailabilitySummaryPanelProps = {
	readonly title: string;
	readonly description: string;
	readonly rows: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamAvailabilitySummaryPanel renders a compact availability summary.
 */
export function TeamAvailabilitySummaryPanel(props: TeamAvailabilitySummaryPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					{props.title}
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					{props.description}
				</h3>
			</div>

			{props.rows.length === 0 ? (
				<CampfireEmpty
					icon={CalendarDays}
					title="No approved leave"
					description="Nobody is marked out for this window."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.rows.map(row => (
						<SummaryLeaveRow key={row.leaveRequest.id} row={row} labelForUserID={props.labelForUserID} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * SummaryLeaveRow renders one compact approved leave row.
 */
function SummaryLeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const request = props.row.leaveRequest;

	return (
		<article className="cf:flex cf:flex-col cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-2">
				<div className="cf:min-w-0">
					<strong className="cf:block cf:truncate cf:text-base cf:font-black cf:text-foreground">
						{props.labelForUserID(request.userId)}
					</strong>
					<p className="cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
						{props.row.leaveTypeName}
					</p>
				</div>

				<CampfireStatusPill tone="green">
					<Umbrella className="cf:size-3.5" />
					Approved
				</CampfireStatusPill>
			</div>

			<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-slate-300">
				{formatLeaveRange(request)} · {formatLeaveDuration(request)}
			</p>
		</article>
	);
}
