import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { isolateBidiText, useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { GlobalLeaveReportRow, LeaveRequest } from '@/types/domain';

import { localizedLeaveTypeName } from '@/features/my-day/leave/my-leave.i18n';

import { formatLeaveRange } from './global-reports.helpers';
import {
	globalLeaveDurationLabel,
	globalLeaveStatusLabel,
} from './global-reports.i18n';

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
	const { t } = useI18n();
	const rows = sortByNewest(props.rows, row => newestLeaveDateValue(row.leaveRequest.leaveRequest));

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">{t('reports.global.leave.rows.eyebrow')}</p>
					<h3 className="campfire-surface-title">{t('reports.global.leave.rows.title')}</h3>
				</div>
			</header>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title={t('reports.global.leave.rows.empty.title')}
					description={t('reports.global.leave.rows.empty.description')}
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
	const { t } = useI18n();
	const request = props.row.leaveRequest.leaveRequest;
	const backupLabel = request.backupUserId.trim() === '' ? t('common.notSet') : props.labelForUserID(request.backupUserId);
	const reason = request.reason.trim();

	return (
		<article className="campfire-report-row-card">
			<div className="campfire-report-row-main">
				<div className="campfire-report-row-title-line">
					<CampfireEllipsisText value={props.labelForUserID(request.userId)} className="campfire-report-row-title" />
					<span className="campfire-report-status-text">{globalLeaveStatusLabel(request.status, t)}</span>
				</div>

				<p className="campfire-report-row-subtitle">
					{t('reports.global.leave.row.subtitle', {
						workspace: isolateBidiText(props.row.workspaceName),
						type: isolateBidiText(localizedLeaveTypeName({ code: '', name: props.row.leaveRequest.leaveTypeName }, t)),
					})}
				</p>

				<div className="campfire-report-row-meta">
					<GlobalLeaveMeta label={t('reports.global.leave.meta.range')} value={formatLeaveRange(request.startDate, request.endDate)} />
					<GlobalLeaveMeta
						label={t('reports.global.leave.meta.duration')}
						value={globalLeaveDurationLabel(request.durationMode, request.halfDayPart, request.startTime, request.endTime, t)}
					/>
					<GlobalLeaveMeta label={t('reports.global.leave.meta.backup')} value={backupLabel} />
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

