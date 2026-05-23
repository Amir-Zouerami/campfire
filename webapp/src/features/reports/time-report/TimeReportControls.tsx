import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';

import { formatTimeReportGroupBy, timeReportGroupByOptions, toTimeReportGroupBy } from './time-report.helpers';
import type { TimeReportFilterDraft, TimeReportFilterPatch } from './time-report.types';

/**
 * TimeReportControlsProps contains time report filter state and actions.
 */
type TimeReportControlsProps = {
	readonly filter: TimeReportFilterDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: TimeReportFilterPatch) => void;
	readonly onLoad: () => Promise<void>;
};

/**
 * TimeReportControls renders date range and grouping controls.
 */
export function TimeReportControls(props: TimeReportControlsProps): ReactElement {
	/**
	 * handleLoad loads the current report.
	 */
	function handleLoad(): void {
		void props.onLoad();
	}

	return (
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto] cf:xl:items-end">
			<CampfireField id="campfire-time-report-start" label="Start date">
				<CampfireDateInput
					id="campfire-time-report-start"
					disabled={props.disabled}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-time-report-end" label="End date">
				<CampfireDateInput
					id="campfire-time-report-end"
					disabled={props.disabled}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-time-report-group" label="Group by">
				<CampfireSelect
					id="campfire-time-report-group"
					disabled={props.disabled}
					value={props.filter.groupBy}
					onValueChange={value => props.onChange({ groupBy: toTimeReportGroupBy(value) })}
				>
					{timeReportGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{formatTimeReportGroupBy(groupBy)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

			<Button type="button" disabled={props.disabled} onClick={handleLoad}>
				<Search className="cf:size-4" />
				Load report
			</Button>
		</div>
	);
}
