import type { ReactElement } from 'react';
import { Bookmark, Send, Trash2 } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import type { ReportKind, SavedReportFilter } from '@/types/domain';

import {
	formatDateTime,
	formatReportKind,
	savedFilterReportKinds,
	selectClassName,
	toReportKind,
} from './saved-filters.helpers';

/**
 * SavedFilterListPanelProps contains saved-filter list state and actions.
 */
type SavedFilterListPanelProps = {
	readonly selectedReportType: ReportKind;
	readonly filters: readonly SavedReportFilter[];
	readonly disabled: boolean;
	readonly onReportTypeChange: (reportType: ReportKind) => void;
	readonly onApply: (filter: SavedReportFilter) => void;
	readonly onDelete: (filterID: string) => Promise<void>;
};

/**
 * SavedFilterListPanel renders saved filters for one report type.
 */
export function SavedFilterListPanel(props: SavedFilterListPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-4">
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Filter library
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Choose and apply
					</h3>
				</div>

				<div className="cf:min-w-[220px]">
					<select
						className={selectClassName()}
						disabled={props.disabled}
						value={props.selectedReportType}
						aria-label="Saved filter report type"
						onChange={event => props.onReportTypeChange(toReportKind(event.currentTarget.value))}
					>
						{savedFilterReportKinds.map(reportKind => (
							<option key={reportKind} value={reportKind}>
								{formatReportKind(reportKind)}
							</option>
						))}
					</select>
				</div>
			</div>

			{props.filters.length === 0 ? (
				<CampfireEmpty
					icon={Bookmark}
					title="No saved filters for this report type"
					description="Create a filter on the left, then apply it from here."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.filters.map(filter => (
						<SavedFilterRow
							key={filter.id}
							filter={filter}
							disabled={props.disabled}
							onApply={() => props.onApply(filter)}
							onDelete={() => props.onDelete(filter.id)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * SavedFilterRow renders one saved filter row.
 */
function SavedFilterRow(props: {
	readonly filter: SavedReportFilter;
	readonly disabled: boolean;
	readonly onApply: () => void;
	readonly onDelete: () => Promise<void>;
}): ReactElement {
	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<h4 className="cf:truncate cf:text-base cf:font-black cf:text-foreground">{props.filter.name}</h4>
					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Updated {formatDateTime(props.filter.updatedAt)}
					</p>
				</div>

				<CampfireStatusPill tone="ember">{formatReportKind(props.filter.reportType)}</CampfireStatusPill>
			</div>

			<pre className="cf:max-h-44 cf:overflow-auto cf:whitespace-pre-wrap cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/30 cf:p-4 cf:text-xs cf:font-semibold cf:leading-6 cf:text-slate-300">
				{props.filter.filterJson}
			</pre>

			<div className="cf:flex cf:flex-wrap cf:justify-end cf:gap-2">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onDelete()}
				>
					<Trash2 className="cf:size-4" />
					Delete
				</Button>

				<Button type="button" disabled={props.disabled} onClick={props.onApply}>
					<Send className="cf:size-4" />
					Apply
				</Button>
			</div>
		</article>
	);
}
