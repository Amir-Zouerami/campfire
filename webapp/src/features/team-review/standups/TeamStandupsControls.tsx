import type { ReactElement } from 'react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import type { StandupSubmissionSortMode } from '@/types/domain';

import { teamStandupSortOptions, toStandupSortMode } from './team-standups.helpers';

/**
 * TeamStandupsControlsProps contains date and sort controls.
 */
type TeamStandupsControlsProps = {
	readonly occurrenceDate: string;
	readonly sortMode: StandupSubmissionSortMode;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly onOccurrenceDateChange: (date: string) => void;
	readonly onSortModeChange: (sortMode: StandupSubmissionSortMode) => void;
};

/**
 * TeamStandupsControls renders focused filters for one standup occurrence.
 */
export function TeamStandupsControls(props: TeamStandupsControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-team-standups-controls" aria-label={t('teamReview.standups.controls.ariaLabel')}>
			<div className="campfire-team-standups-control-item">
				<CampfireField id="campfire-team-standups-date" label={t('teamReview.standups.controls.date.label')}>
					<CampfireDateInput
						id="campfire-team-standups-date"
						disabled={props.disabled}
						timezone={props.timezone}
						value={props.occurrenceDate}
						onValueChange={props.onOccurrenceDateChange}
					/>
				</CampfireField>
			</div>

			<div className="campfire-team-standups-control-item">
				<CampfireField id="campfire-team-standups-sort" label={t('teamReview.standups.controls.sort.label')}>
					<CampfireSelect
						id="campfire-team-standups-sort"
						disabled={props.disabled}
						value={props.sortMode}
						onValueChange={value => props.onSortModeChange(toStandupSortMode(value))}
					>
						{teamStandupSortOptions.map(option => (
							<option key={option.value} value={option.value}>
								{t(option.labelKey)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>
			</div>
		</div>
	);
}
