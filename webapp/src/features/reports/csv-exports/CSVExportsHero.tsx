import type { ReactElement } from 'react';
import { CalendarDays, Download, FileDown, FileSpreadsheet } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

import type { CSVExportFilterDraft, CSVExportKind } from './csv-exports.types';

/**
 * CSVExportsHeroProps contains export center summary state.
 */
type CSVExportsHeroProps = {
	readonly filter: CSVExportFilterDraft;
	readonly activeExportKind: CSVExportKind | null;
};

/**
 * CSVExportsHero renders the CSV export center header.
 */
export function CSVExportsHero(props: CSVExportsHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="CSV exports"
				title="Download workspace data"
				description="Export time entries, approved leave, standup answers, or missing standup rows for the selected range."
				icon={FileSpreadsheet}
				action={<CampfireStatusPill tone="ember">Workspace CSV</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric label="Start" value={props.filter.startDate} helper="Inclusive" icon={CalendarDays} />
				<CampfireMetric label="End" value={props.filter.endDate} helper="Inclusive" icon={CalendarDays} />
				<CampfireMetric label="Sort" value={props.filter.sortMode} helper="Standup exports" />
				<CampfireMetric
					label="Status"
					value={props.activeExportKind === null ? 'Ready' : 'Exporting'}
					helper="Browser download"
					icon={props.activeExportKind === null ? Download : FileDown}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
