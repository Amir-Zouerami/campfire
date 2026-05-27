import type { ReactElement } from 'react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
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
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:md:grid-cols-2">
			<div className={rangeInputClassName()}>
				<Label htmlFor="campfire-availability-start">Start date</Label>
				<CampfireDateInput
					id="campfire-availability-start"
					disabled={props.disabled}
					value={props.range.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</div>

			<div className={rangeInputClassName()}>
				<Label htmlFor="campfire-availability-end">End date</Label>
				<CampfireDateInput
					id="campfire-availability-end"
					disabled={props.disabled}
					value={props.range.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</div>
		</div>
	);
}
