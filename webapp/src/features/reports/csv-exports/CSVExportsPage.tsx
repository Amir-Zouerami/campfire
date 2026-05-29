import type { ReactElement } from 'react';
import { CalendarRange, Download, SlidersHorizontal } from 'lucide-react';

import { CampfireStatCard, CampfireWorkflowIntro } from '@/components/campfire/CampfireLayoutPrimitives';
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
				<CampfireStatCard icon={CalendarRange} label="Start" value={exports.filter.startDate} helper="Date range" tone="slate" />
				<CampfireStatCard icon={CalendarRange} label="End" value={exports.filter.endDate} helper="Date range" tone="slate" />
				<CampfireStatCard
					icon={SlidersHorizontal}
					label="Sort"
					value={formatCSVExportSortMode(exports.filter.sortMode)}
					helper="Standup exports"
				/>
			</div>

			<CampfireWorkflowIntro
				eyebrow="CSV exports"
				title="Export controls"
				description="Choose one range, then download the exact dataset you need."
				controls={
					<CSVExportControls
						filter={exports.filter}
						disabled={exports.isBusy}
						timezone={props.workspace.timezone}
						onChange={exports.updateFilter}
					/>
				}
			>
				<CSVExportFeedback state={exports.loadState} message={exports.message} />
			</CampfireWorkflowIntro>

			{exports.loadState === 'exporting' && <CSVExportLoading />}

			<CSVExportActionsPanel
				disabled={exports.isBusy}
				activeExportKind={exports.activeExportKind}
				onExport={exports.exportCSV}
			/>
		</div>
	);
}
