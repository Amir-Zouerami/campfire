import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { sortByNewest } from '@/lib/sort';
import type { GlobalLeaveReportRow, LeaveRequest } from '@/types/domain';

import {
	formatLeaveDuration,
	formatLeaveRange,
	formatLeaveStatus,
} from './global-reports.helpers';

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
	const rows = sortByNewest(props.rows, row => newestLeaveDateValue(row.leaveRequest.leaveRequest));

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">Leave rows</p>
					<h3 className="campfire-surface-title">Requests across workspaces</h3>
				</div>
			</header>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title="No global leave rows"
					description="No leave requests matched this global date range."
				/>
			) : (
				<div className="campfire-report-row-list">
					{rows.map(row => (
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
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting global leave rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
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
	const reason = request.reason.trim();

	return (
		<article className="campfire-report-row-card">
			<div className="campfire-report-row-main">
				<div className="campfire-report-row-title-line">
					<CampfireEllipsisText value={props.labelForUserID(request.userId)} className="campfire-report-row-title" />
					<span className="campfire-report-status-text">{formatLeaveStatus(request.status)}</span>
				</div>

				<p className="campfire-report-row-subtitle">
					{props.row.workspaceName} · {props.row.leaveRequest.leaveTypeName}
				</p>

				<div className="campfire-report-row-meta">
					<GlobalLeaveMeta label="Range" value={formatLeaveRange(request.startDate, request.endDate)} />
					<GlobalLeaveMeta
						label="Duration"
						value={formatLeaveDuration(request.durationMode, request.halfDayPart, request.startTime, request.endTime)}
					/>
					<GlobalLeaveMeta label="Backup" value={backupLabel} />
				</div>

				{reason !== '' && <p className="campfire-report-row-note">{reason}</p>}
			</div>
		</article>
	);
}

/**
 * GlobalLeaveMeta renders compact leave metadata.
 */
function GlobalLeaveMeta(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="campfire-report-meta-chip">
			<span>{props.label}</span>
			<CampfireEllipsisText value={props.value} />
		</span>
	);
}
