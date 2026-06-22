import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { useI18n } from '@/i18n';

/**
 * TeamRuntimeControlsProps contains runtime date controls.
 */
type TeamRuntimeControlsProps = {
	readonly date: string;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly onDateChange: (date: string) => void;
	readonly onTodayClick: () => void;
};

/**
 * TeamRuntimeControls renders the runtime date picker.
 */
export function TeamRuntimeControls(props: TeamRuntimeControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-team-control-grid campfire-team-control-grid--runtime">
			<CampfireField id="campfire-team-runtime-date" label={t('teamReview.runtime.controls.date.label')}>
				<CampfireDateInput
					id="campfire-team-runtime-date"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.date}
					onValueChange={props.onDateChange}
				/>
			</CampfireField>

			<CampfireControlButton
				type="button"
				variant="secondary"
				disabled={props.disabled}
				onClick={props.onTodayClick}
			>
				<Search className="cf:size-4" />
				{t('teamReview.runtime.controls.today')}
			</CampfireControlButton>
		</div>
	);
}
