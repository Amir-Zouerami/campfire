import type { ReactElement } from 'react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';

import type { CSVExportFilterDraft, CSVExportFilterPatch } from './csv-exports.types';
import { csvExportSortOptions, formatCSVExportSortMode, toCSVExportSortMode } from './csv-exports.helpers';

/**
 * CSVExportControlsProps contains CSV export filters.
 */
type CSVExportControlsProps = {
	readonly filter: CSVExportFilterDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: CSVExportFilterPatch) => void;
};

/**
 * CSVExportControls renders shared CSV export filters.
 */
export function CSVExportControls(props: CSVExportControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr]">
			<CampfireField id="campfire-csv-export-start" label="Start date">
				<CampfireDateInput
					id="campfire-csv-export-start"
					disabled={props.disabled}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-csv-export-end" label="End date">
				<CampfireDateInput
					id="campfire-csv-export-end"
					disabled={props.disabled}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-csv-export-sort" label="Sort mode">
				<CampfireSelect
					id="campfire-csv-export-sort"
					disabled={props.disabled}
					value={props.filter.sortMode}
					onValueChange={value => props.onChange({ sortMode: toCSVExportSortMode(value) })}
				>
					{csvExportSortOptions.map(sortMode => (
						<option key={sortMode} value={sortMode}>
							{formatCSVExportSortMode(sortMode)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>
		</div>
	);
}
