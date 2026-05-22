import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { rangeInputClassName } from './team-availability.helpers';
import type { TeamAvailabilityRange } from './team-availability.types';

/**
 * TeamAvailabilityRangeControlsProps contains the selected availability date range.
 */
type TeamAvailabilityRangeControlsProps = {
	readonly range: TeamAvailabilityRange;
	readonly disabled: boolean;
	readonly onChange: (patch: Partial<TeamAvailabilityRange>) => void;
};

/**
 * TeamAvailabilityRangeControls renders the approved leave date window controls.
 */
export function TeamAvailabilityRangeControls(props: TeamAvailabilityRangeControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:md:grid-cols-2">
			<div className={rangeInputClassName()}>
				<Label htmlFor="campfire-availability-start">Start date</Label>
				<Input
					id="campfire-availability-start"
					type="date"
					disabled={props.disabled}
					value={props.range.startDate}
					onChange={event => props.onChange({ startDate: event.currentTarget.value })}
				/>
			</div>

			<div className={rangeInputClassName()}>
				<Label htmlFor="campfire-availability-end">End date</Label>
				<Input
					id="campfire-availability-end"
					type="date"
					disabled={props.disabled}
					value={props.range.endDate}
					onChange={event => props.onChange({ endDate: event.currentTarget.value })}
				/>
			</div>
		</div>
	);
}
