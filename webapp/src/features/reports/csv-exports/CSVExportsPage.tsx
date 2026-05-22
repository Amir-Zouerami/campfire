import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import type { Workspace } from '@/types/domain';

import { CSVExportActionsPanel } from './CSVExportActionsPanel';
import { CSVExportControls } from './CSVExportControls';
import { CSVExportFeedback, CSVExportLoading } from './CSVExportFeedback';
import { CSVExportsHero } from './CSVExportsHero';
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
		<div className="cf:grid cf:gap-5">
			<CSVExportsHero filter={exports.filter} activeExportKind={exports.activeExportKind} />

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<CSVExportFeedback state={exports.loadState} message={exports.message} />

					<CSVExportControls
						filter={exports.filter}
						disabled={exports.isBusy}
						onChange={exports.updateFilter}
					/>

					{exports.loadState === 'exporting' && <CSVExportLoading />}

					<CSVExportActionsPanel
						disabled={exports.isBusy}
						activeExportKind={exports.activeExportKind}
						onExport={exports.exportCSV}
					/>
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
