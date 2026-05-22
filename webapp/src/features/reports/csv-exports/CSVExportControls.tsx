import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
	csvExportSortOptions,
	formatCSVExportSortMode,
	selectClassName,
	toCSVExportSortMode,
} from './csv-exports.helpers';
import type { CSVExportFilterDraft, CSVExportFilterPatch } from './csv-exports.types';

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
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr]">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-csv-export-start">Start date</Label>
				<Input
					id="campfire-csv-export-start"
					type="date"
					disabled={props.disabled}
					value={props.filter.startDate}
					onChange={event => props.onChange({ startDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-csv-export-end">End date</Label>
				<Input
					id="campfire-csv-export-end"
					type="date"
					disabled={props.disabled}
					value={props.filter.endDate}
					onChange={event => props.onChange({ endDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-csv-export-sort">Standup sort mode</Label>
				<select
					id="campfire-csv-export-sort"
					className={selectClassName()}
					disabled={props.disabled}
					value={props.filter.sortMode}
					onChange={event => props.onChange({ sortMode: toCSVExportSortMode(event.currentTarget.value) })}
				>
					{csvExportSortOptions.map(sortMode => (
						<option key={sortMode} value={sortMode}>
							{formatCSVExportSortMode(sortMode)}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
