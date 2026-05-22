import type { ReactElement } from 'react';
import { Clock3, Rows3 } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
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
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Grouped rows
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Global time breakdown
				</h3>
			</div>

			{props.rows.length === 0 ? (
				<CampfireEmpty
					icon={Rows3}
					title="No grouped rows"
					description="No time entries matched this grouping and date range."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.rows.map(row => (
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

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-black cf:text-foreground">
						{globalTimeRowTitle(props.row, props.groupBy, props.labelForUserID)}
					</h4>
					<CampfireStatusPill tone="green">
						<Clock3 className="cf:size-3.5" />
						{formatMinutes(props.row.minutes)}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					{globalTimeRowSubtitle(props.row)}
				</p>

				{metaChips.length > 0 && (
					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						{metaChips.map(chip => (
							<span
								key={`${chip.label}-${chip.value}`}
								className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100"
							>
								{chip.label}: {chip.value}
							</span>
						))}
					</div>
				)}
			</div>

			<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3 cf:text-right">
				<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">Entries</p>
				<p className="cf:mt-1 cf:text-2xl cf:font-black cf:text-foreground">{props.row.entryCount}</p>
			</div>
		</article>
	);
}
