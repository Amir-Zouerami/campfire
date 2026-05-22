import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
	formatGroupBy,
	globalTimeGroupByOptions,
	selectClassName,
	toTimeReportGroupBy,
} from './global-reports.helpers';
import type { GlobalTimeReportFilter, GlobalTimeReportFilterPatch } from './global-reports.types';

/**
 * GlobalTimeControlsProps contains global time report filters and actions.
 */
type GlobalTimeControlsProps = {
	readonly filter: GlobalTimeReportFilter;
	readonly disabled: boolean;
	readonly onChange: (patch: GlobalTimeReportFilterPatch) => void;
	readonly onLoad: () => Promise<void>;
	readonly onExport: () => Promise<void>;
};

/**
 * GlobalTimeControls renders date/group filters and load/export actions.
 */
export function GlobalTimeControls(props: GlobalTimeControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto_auto] cf:xl:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-global-time-start">Start date</Label>
				<Input
					id="campfire-global-time-start"
					type="date"
					disabled={props.disabled}
					value={props.filter.startDate}
					onChange={event => props.onChange({ startDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-global-time-end">End date</Label>
				<Input
					id="campfire-global-time-end"
					type="date"
					disabled={props.disabled}
					value={props.filter.endDate}
					onChange={event => props.onChange({ endDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-global-time-group">Group by</Label>
				<select
					id="campfire-global-time-group"
					className={selectClassName()}
					disabled={props.disabled}
					value={props.filter.groupBy}
					onChange={event => props.onChange({ groupBy: toTimeReportGroupBy(event.currentTarget.value) })}
				>
					{globalTimeGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{formatGroupBy(groupBy)}
						</option>
					))}
				</select>
			</div>

			<Button type="button" disabled={props.disabled} onClick={() => void props.onLoad()}>
				<Search className="cf:size-4" />
				Load
			</Button>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onExport()}>
				<Download className="cf:size-4" />
				CSV
			</Button>
		</div>
	);
}
