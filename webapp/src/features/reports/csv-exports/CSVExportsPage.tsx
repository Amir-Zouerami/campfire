import type { ReactElement } from 'react';
import { CalendarRange, Download, FileDown, SlidersHorizontal } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import type { Workspace } from '@/types/domain';

import { CSVExportActionsPanel } from './CSVExportActionsPanel';
import { CSVExportControls } from './CSVExportControls';
import { CSVExportFeedback, CSVExportLoading } from './CSVExportFeedback';
import { csvExportActions, formatCSVExportSortMode } from './csv-exports.helpers';
import { useCSVExports } from './useCSVExports';

/**
 * CSVExportsPageProps contains workspace context for CSV downloads.
 */
type CSVExportsPageProps = {
	readonly workspace: Workspace;
};

/**
 * CSVExportsPage renders the rewritten workspace CSV export center.
 */
export function CSVExportsPage(props: CSVExportsPageProps): ReactElement {
	const exports = useCSVExports({
		workspace: props.workspace,
	});

	return (
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={Download} label="Exports" value={String(csvExportActions.length)} helper="Available CSV files" />
				<CampfireStatCard icon={CalendarRange} label="Start" value={exports.filter.startDate} helper="Date range" tone="blue" />
				<CampfireStatCard icon={CalendarRange} label="End" value={exports.filter.endDate} helper="Date range" tone="blue" />
				<CampfireStatCard
					icon={SlidersHorizontal}
					label="Sort"
					value={formatCSVExportSortMode(exports.filter.sortMode)}
					helper="Standup exports"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">CSV exports</p>
						<h3 className="campfire-surface-title">Export controls</h3>
						<p className="campfire-surface-description">Choose one range, then download the exact dataset you need.</p>
					</div>
					<FileDown className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<CSVExportFeedback state={exports.loadState} message={exports.message} />
				<CSVExportControls
					filter={exports.filter}
					disabled={exports.isBusy}
					timezone={props.workspace.timezone}
					onChange={exports.updateFilter}
				/>
			</CampfireSurface>

			{exports.loadState === 'exporting' && <CSVExportLoading />}

			<CSVExportActionsPanel
				disabled={exports.isBusy}
				activeExportKind={exports.activeExportKind}
				onExport={exports.exportCSV}
			/>
		</div>
	);
}
