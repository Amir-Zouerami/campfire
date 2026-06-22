import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { CSVExportActionsPanel } from './CSVExportActionsPanel';
import { CSVExportControls } from './CSVExportControls';
import { CSVExportFeedback, CSVExportLoading } from './CSVExportFeedback';
import { csvExportActions } from './csv-exports.helpers';
import { csvExportSortModeLabel } from './csv-exports.i18n';
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
	const { t } = useI18n();
	const exports = useCSVExports({
		workspace: props.workspace,
	});

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfireControlsPanel
				eyebrow={t('reports.csv.controls.eyebrow')}
				title={t('reports.csv.controls.title')}
				description={t('reports.csv.controls.description')}
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
					{ label: t('reports.csv.summary.availableExports'), value: String(csvExportActions.length), tone: 'neutral' },
					{ label: t('reports.csv.summary.start'), value: exports.filter.startDate, tone: 'neutral' },
					{ label: t('reports.csv.summary.end'), value: exports.filter.endDate, tone: 'neutral' },
					{ label: t('reports.csv.summary.standupSort'), value: csvExportSortModeLabel(exports.filter.sortMode, t), tone: 'neutral' },
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
