import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StandupSubmissionSortMode } from '@/types/domain';

import { selectClassName, teamStandupSortOptions, toStandupSortMode } from './team-standups.helpers';

/**
 * TeamStandupsControlsProps contains date and sort controls.
 */
type TeamStandupsControlsProps = {
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
	readonly disabled: boolean;
	readonly onOccurrenceDateChange: (date: string) => void;
	readonly onSortModeChange: (sortMode: StandupSubmissionSortMode) => void;
};

/**
 * TeamStandupsControls renders focused filters for one standup occurrence.
 */
export function TeamStandupsControls(props: TeamStandupsControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:md:grid-cols-[16rem_1fr]">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-team-standups-date">Occurrence date</Label>
				<Input
					id="campfire-team-standups-date"
					type="date"
					disabled={props.disabled}
					value={props.occurrenceDate}
					onChange={event => props.onOccurrenceDateChange(event.currentTarget.value)}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-team-standups-sort">Sort review by</Label>
				<select
					id="campfire-team-standups-sort"
					className={selectClassName()}
					disabled={props.disabled}
					value={props.sortMode}
					onChange={event => props.onSortModeChange(toStandupSortMode(event.currentTarget.value))}
				>
					{teamStandupSortOptions.map(option => (
						<option key={option.value} value={option.value}>
							{option.label} · {option.helper}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
