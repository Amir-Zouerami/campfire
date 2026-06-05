import type { ReactElement } from 'react';
import { Clock3, Rows3 } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import type { TimeReportGroupBy, TimeReportRow } from '@/types/domain';

import {
	formatMinutes,
	globalTimeRowMetaChips,
	globalTimeRowSubtitle,
	globalTimeRowTitle,
} from './global-reports.helpers';

/**
 * GlobalTimeRowsPanelProps contains global grouped time rows.
 */
type GlobalTimeRowsPanelProps = {
	readonly groupBy: TimeReportGroupBy;
	readonly rows: readonly TimeReportRow[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * GlobalTimeRowsPanel renders grouped global time report rows.
 */
export function GlobalTimeRowsPanel(props: GlobalTimeRowsPanelProps): ReactElement {
	const rows = sortGlobalRowsNewestFirst(props.rows);

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">Grouped rows</p>
					<h3 className="campfire-surface-title">Global time breakdown</h3>
				</div>
			</header>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Rows3}
					title="No grouped rows"
					description="No time entries matched this grouping and date range."
				/>
			) : (
				<div className="campfire-report-row-list">
					{rows.map(row => (
						<GlobalTimeRow
							key={`${row.key}-${row.periodStart}-${row.periodEnd}`}
							row={row}
							groupBy={props.groupBy}
							labelForUserID={props.labelForUserID}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * GlobalTimeRow renders one grouped global time row.
 */
function GlobalTimeRow(props: {
	readonly row: TimeReportRow;
	readonly groupBy: TimeReportGroupBy;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const metaChips = globalTimeRowMetaChips(props.row);
	const title = globalTimeRowTitle(props.row, props.groupBy, props.labelForUserID);

	return (
		<article className="campfire-report-row-card">
			<div className="campfire-report-row-main">
				<div className="campfire-report-row-title-line">
					<CampfireEllipsisText value={title} className="campfire-report-row-title" />
					<span className="campfire-report-duration">
						<Clock3 className="cf:size-4" />
						{formatMinutes(props.row.minutes)}
					</span>
				</div>

				<p className="campfire-report-row-subtitle">{globalTimeRowSubtitle(props.row)}</p>

				{metaChips.length > 0 && (
					<div className="campfire-report-row-meta">
						{metaChips.map(chip => (
							<span key={`${chip.label}-${chip.value}`} className="campfire-report-meta-chip">
								<span>{chip.label}</span>
								<CampfireEllipsisText value={chip.value} />
							</span>
						))}
					</div>
				)}
			</div>

			<div className="campfire-report-row-count" aria-label={`${props.row.entryCount} entries`}>
				<strong>{props.row.entryCount}</strong>
				<span>{props.row.entryCount === 1 ? 'entry' : 'entries'}</span>
			</div>
		</article>
	);
}

/**
 * sortGlobalRowsNewestFirst sorts global rows by period date descending.
 */
function sortGlobalRowsNewestFirst(rows: readonly TimeReportRow[]): readonly TimeReportRow[] {
	return [...rows].sort((left, right) => {
		const rightDate = right.periodEnd || right.periodStart;
		const leftDate = left.periodEnd || left.periodStart;

		return rightDate.localeCompare(leftDate);
	});
}
