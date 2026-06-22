import type { ReactElement } from 'react';
import { Clock3, Rows3 } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import type { TimeReportGroupBy, TimeReportRow } from '@/types/domain';

import { formatMinutes, timeReportRowTitle } from './time-report.helpers';
import { timeReportRowMetaChips, timeReportRowSubtitle } from './time-report.i18n';

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
	const { t } = useI18n();
	const rows = sortReportRowsNewestFirst(props.rows);

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">{t('reports.time.rows.eyebrow')}</p>
					<h3 className="campfire-surface-title">{t('reports.time.rows.title')}</h3>
				</div>
			</header>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Rows3}
					title={t('reports.time.empty.title')}
					description={t('reports.time.empty.description')}
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
	const { t } = useI18n();
	const metaChips = timeReportRowMetaChips(props.row, t);
	const title = timeReportRowTitle(props.row, props.groupBy, props.labelForUserID, t('reports.time.row.unlabeled'));
	const entryLabel = props.row.entryCount === 1
		? t('reports.time.row.entrySingular')
		: t('reports.time.row.entryPlural', { count: props.row.entryCount });

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

				<p className="campfire-report-row-subtitle">{timeReportRowSubtitle(props.row, t)}</p>

				{metaChips.length > 0 && (
					<div className="campfire-report-row-meta">
						{metaChips.map(chip => (
							<TimeReportMeta key={`${chip.label}-${chip.value}`} label={chip.label} value={chip.value} />
						))}
					</div>
				)}
			</div>

			<div className="campfire-report-row-count" aria-label={entryLabel}>
				<strong>{props.row.entryCount}</strong>
				<span>{entryLabel}</span>
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
