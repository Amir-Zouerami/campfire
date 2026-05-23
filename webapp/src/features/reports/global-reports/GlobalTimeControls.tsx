import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';

import { formatGroupBy, globalTimeGroupByOptions, toTimeReportGroupBy } from './global-reports.helpers';
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
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto_auto] cf:xl:items-end">
			<CampfireField id="campfire-global-time-start" label="Start date">
				<CampfireDateInput
					id="campfire-global-time-start"
					disabled={props.disabled}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-time-end" label="End date">
				<CampfireDateInput
					id="campfire-global-time-end"
					disabled={props.disabled}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-time-group" label="Group by">
				<CampfireSelect
					id="campfire-global-time-group"
					disabled={props.disabled}
					value={props.filter.groupBy}
					onValueChange={value => props.onChange({ groupBy: toTimeReportGroupBy(value) })}
				>
					{globalTimeGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{formatGroupBy(groupBy)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

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
