import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
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
 * CSVExportsPage renders the workspace CSV export center.
 */
export function CSVExportsPage(props: CSVExportsPageProps): ReactElement {
	const exports = useCSVExports({
		workspace: props.workspace,
	});

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Export range"
				description="These filters apply to every CSV action below."
				controls={(
					<CSVExportControls
						filter={exports.filter}
						disabled={exports.isBusy}
						timezone={props.workspace.timezone}
						onChange={exports.updateFilter}
					/>
				)}
			>
				<CSVExportFeedback state={exports.loadState} message={exports.message} />
			</CampfireControlsPanel>

			<CampfireReportSummaryBar
				items={[
					{ label: 'Available exports', value: String(csvExportActions.length), tone: 'neutral' },
					{ label: 'Start', value: exports.filter.startDate, tone: 'neutral' },
					{ label: 'End', value: exports.filter.endDate, tone: 'neutral' },
					{ label: 'Standup sort', value: formatCSVExportSortMode(exports.filter.sortMode), tone: 'neutral' },
				]}
			/>

			{exports.loadState === 'exporting' && <CSVExportLoading />}

			<CSVExportActionsPanel
				disabled={exports.isBusy}
				activeExportKind={exports.activeExportKind}
				onExport={exports.exportCSV}
			/>
		</div>
	);
}
