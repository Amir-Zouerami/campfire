import type { ReactElement } from 'react';
import { Bookmark, Send, Trash2 } from 'lucide-react';

import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import type { ReportKind, SavedReportFilter } from '@/types/domain';

import { formatDateTime, formatReportKind, savedFilterReportKinds, toReportKind } from './saved-filters.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<section className="campfire-flat-work-panel">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-4">
				<div>
					<p className="campfire-page-eyebrow">
						Filter library
					</p>
					<h3 className="campfire-surface-title">
						Choose and apply
					</h3>
				</div>

				<div className="cf:min-w-55">
					<CampfireSelect
						id="campfire-saved-filter-list-type"
						disabled={props.disabled}
						value={props.selectedReportType}
						onValueChange={value => props.onReportTypeChange(toReportKind(value))}
					>
						{savedFilterReportKinds.map(reportKind => (
							<option key={reportKind} value={reportKind}>
								{formatReportKind(reportKind)}
							</option>
						))}
					</CampfireSelect>
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
		<article className="campfire-flat-list-row">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<h4 className="cf:truncate cf:text-base cf:font-semibold cf:text-foreground">{props.filter.name}</h4>
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
				<Button type="button" variant="outline" disabled={props.disabled} onClick={props.onApply}>
					<Send className="cf:size-4" />
					Apply
				</Button>

				<Button
					type="button"
					variant="destructive"
					disabled={props.disabled}
					onClick={() => void props.onDelete()}
				>
					<Trash2 className="cf:size-4" />
					Delete
				</Button>
			</div>
		</article>
	);
}