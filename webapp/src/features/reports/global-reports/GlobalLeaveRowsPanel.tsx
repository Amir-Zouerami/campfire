import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import type { GlobalLeaveReportRow } from '@/types/domain';

import { formatLeaveDuration, formatLeaveRange, formatLeaveStatus, leaveStatusTone } from './global-reports.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * GlobalLeaveRowsPanelProps contains global leave report rows.
 */
type GlobalLeaveRowsPanelProps = {
	readonly rows: readonly GlobalLeaveReportRow[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * GlobalLeaveRowsPanel renders global leave rows across workspaces.
 */
export function GlobalLeaveRowsPanel(props: GlobalLeaveRowsPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Leave rows
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Requests across workspaces
				</h3>
			</div>

			{props.rows.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title="No global leave rows"
					description="No leave requests matched this global date range."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.rows.map(row => (
						<GlobalLeaveRow
							key={`${row.workspaceId}-${row.leaveRequest.leaveRequest.id}`}
							row={row}
							labelForUserID={props.labelForUserID}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * GlobalLeaveRow renders one global leave report row.
 */
function GlobalLeaveRow(props: {
	readonly row: GlobalLeaveReportRow;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const request = props.row.leaveRequest.leaveRequest;
	const backupLabel = request.backupUserId.trim() === '' ? 'Not set' : props.labelForUserID(request.backupUserId);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						{props.labelForUserID(request.userId)}
					</h4>
					<CampfireStatusPill tone={leaveStatusTone(request.status)}>
						{formatLeaveStatus(request.status)}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					{props.row.workspaceName} · {props.row.leaveRequest.leaveTypeName}
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<GlobalLeaveChip label="Range" value={formatLeaveRange(request.startDate, request.endDate)} />
					<GlobalLeaveChip
						label="Duration"
						value={formatLeaveDuration(
							request.durationMode,
							request.halfDayPart,
							request.startTime,
							request.endTime,
						)}
					/>
					<GlobalLeaveChip label="Backup" value={backupLabel} />
				</div>

				{request.reason.trim() !== '' && (
					<p className="cf:mt-3 cf:text-sm cf:font-semibold cf:leading-6 cf:text-slate-300">
						{request.reason}
					</p>
				)}
			</div>

			<CampfireStatusPill tone="slate">
				<Umbrella className="cf:size-3.5" />
				Global row
			</CampfireStatusPill>
		</article>
	);
}

/**
 * GlobalLeaveChip renders compact leave metadata.
 */
function GlobalLeaveChip(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-semibold cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}
