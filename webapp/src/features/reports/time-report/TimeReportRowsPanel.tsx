import type { ReactElement } from 'react';
import { Clock3, Rows3 } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import type { TimeReportGroupBy, TimeReportRow } from '@/types/domain';

import {
	formatMinutes,
	timeReportRowMetaChips,
	timeReportRowSubtitle,
	timeReportRowTitle,
} from './time-report.helpers';

/**
 * TimeReportRowsPanelProps contains grouped time report rows.
 */
type TimeReportRowsPanelProps = {
	readonly groupBy: TimeReportGroupBy;
	readonly rows: readonly TimeReportRow[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TimeReportRowsPanel renders grouped workspace time report rows in a readable flat list.
 */
export function TimeReportRowsPanel(props: TimeReportRowsPanelProps): ReactElement {
	const rows = sortReportRowsNewestFirst(props.rows);

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">Grouped results</p>
					<h3 className="campfire-surface-title">Time rows</h3>
				</div>
			</header>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Rows3}
					title="No time entries in this range"
					description="Try another date range or log time against tasks first."
				/>
			) : (
				<div className="campfire-report-row-list">
					{rows.map(row => (
						<TimeReportRowCard
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
 * TimeReportRowCard renders one grouped report row.
 */
function TimeReportRowCard(props: {
	readonly row: TimeReportRow;
	readonly groupBy: TimeReportGroupBy;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const metaChips = timeReportRowMetaChips(props.row);
	const title = timeReportRowTitle(props.row, props.groupBy, props.labelForUserID);

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

				<p className="campfire-report-row-subtitle">{timeReportRowSubtitle(props.row)}</p>

				{metaChips.length > 0 && (
					<div className="campfire-report-row-meta">
						{metaChips.map(chip => (
							<TimeReportMeta key={`${chip.label}-${chip.value}`} label={chip.label} value={chip.value} />
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
 * TimeReportMeta renders compact report row metadata with bidi-safe text.
 */
function TimeReportMeta(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<span className="campfire-report-meta-chip">
			<span>{props.label}</span>
			<CampfireEllipsisText value={props.value} />
		</span>
	);
}

/**
 * sortReportRowsNewestFirst sorts report rows by their newest covered period.
 */
function sortReportRowsNewestFirst(rows: readonly TimeReportRow[]): readonly TimeReportRow[] {
	return [...rows].sort((left, right) => {
		const rightDate = right.periodEnd || right.periodStart;
		const leftDate = left.periodEnd || left.periodStart;

		return rightDate.localeCompare(leftDate);
	});
}
