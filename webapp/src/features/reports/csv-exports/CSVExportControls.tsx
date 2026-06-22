import type { ReactElement } from 'react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { useI18n } from '@/i18n';

import type { CSVExportFilterDraft, CSVExportFilterPatch } from './csv-exports.types';
import { csvExportSortOptions, toCSVExportSortMode } from './csv-exports.helpers';
import { csvExportSortModeLabel } from './csv-exports.i18n';

/**
 * CSVExportControlsProps contains CSV export filters.
 */
type CSVExportControlsProps = {
	readonly filter: CSVExportFilterDraft;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly onChange: (patch: CSVExportFilterPatch) => void;
};

/**
 * CSVExportControls renders shared CSV export filters.
 */
export function CSVExportControls(props: CSVExportControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-control-grid campfire-control-grid--csv-export">
			<CampfireField id="campfire-csv-export-start" label={t('reports.csv.field.startDate')}>
				<CampfireDateInput
					id="campfire-csv-export-start"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-csv-export-end" label={t('reports.csv.field.endDate')}>
				<CampfireDateInput
					id="campfire-csv-export-end"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-csv-export-sort" label={t('reports.csv.field.sortMode')}>
				<CampfireSelect
					id="campfire-csv-export-sort"
					disabled={props.disabled}
					value={props.filter.sortMode}
					onValueChange={value => props.onChange({ sortMode: toCSVExportSortMode(value) })}
				>
					{csvExportSortOptions.map(sortMode => (
						<option key={sortMode} value={sortMode}>
							{csvExportSortModeLabel(sortMode, t)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>
		</div>
	);
}
