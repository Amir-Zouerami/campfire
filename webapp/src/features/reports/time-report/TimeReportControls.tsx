import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
	formatTimeReportGroupBy,
	selectClassName,
	timeReportGroupByOptions,
	toTimeReportGroupBy,
} from './time-report.helpers';
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
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto] cf:xl:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-time-report-start">Start date</Label>
				<Input
					id="campfire-time-report-start"
					type="date"
					disabled={props.disabled}
					value={props.filter.startDate}
					onChange={event => props.onChange({ startDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-time-report-end">End date</Label>
				<Input
					id="campfire-time-report-end"
					type="date"
					disabled={props.disabled}
					value={props.filter.endDate}
					onChange={event => props.onChange({ endDate: event.currentTarget.value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-time-report-group">Group by</Label>
				<select
					id="campfire-time-report-group"
					className={selectClassName()}
					disabled={props.disabled}
					value={props.filter.groupBy}
					onChange={event => props.onChange({ groupBy: toTimeReportGroupBy(event.currentTarget.value) })}
				>
					{timeReportGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{formatTimeReportGroupBy(groupBy)}
						</option>
					))}
				</select>
			</div>

			<Button type="button" disabled={props.disabled} onClick={handleLoad}>
				<Search className="cf:size-4" />
				Load report
			</Button>
		</div>
	);
}
