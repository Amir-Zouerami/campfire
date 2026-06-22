import { useMemo, type ReactElement } from 'react';

import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';

/**
 * CampfireTimezoneSelectProps contains one controlled IANA timezone selector.
 */
type CampfireTimezoneSelectProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly onChange: (timezone: string) => void;
};

type IntlWithSupportedValuesOf = typeof Intl & {
	readonly supportedValuesOf?: (key: 'timeZone') => string[];
};

const fallbackTimezones = [
	'Asia/Tehran',
	'UTC',
	'Europe/Berlin',
	'Europe/London',
	'Europe/Paris',
	'America/New_York',
	'America/Los_Angeles',
	'Asia/Dubai',
	'Asia/Riyadh',
	'Asia/Tokyo',
] as const;

/**
 * CampfireTimezoneSelect renders the shared searchable timezone picker.
 */
export function CampfireTimezoneSelect(props: CampfireTimezoneSelectProps): ReactElement {
	const { t } = useI18n();
	const timezones = useMemo(() => timezoneOptions(props.value), [props.value]);

	return (
		<CampfireSelect
			id={props.id}
			value={props.value}
			disabled={props.disabled}
			searchable={true}
			maxVisibleOptions={12}
			searchPlaceholder={t('shared.timezoneSelect.searchPlaceholder')}
			onValueChange={props.onChange}
		>
			{timezones.map(timezone => (
				<option key={timezone} value={timezone}>
					{timezone}
				</option>
			))}
		</CampfireSelect>
	);
}

/**
 * timezoneOptions returns stable IANA timezone options and preserves unknown saved values.
 */
function timezoneOptions(currentTimezone: string): readonly string[] {
	const intl = Intl as IntlWithSupportedValuesOf;
	const supported = intl.supportedValuesOf?.('timeZone') ?? [];
	const options = supported.length > 0 ? supported : [...fallbackTimezones];
	const unique = new Set<string>();

	for (const option of options) {
		const cleanOption = option.trim();
		if (cleanOption !== '') {
			unique.add(cleanOption);
		}
	}

	const cleanCurrentTimezone = currentTimezone.trim();
	if (cleanCurrentTimezone !== '') {
		unique.add(cleanCurrentTimezone);
	}

	return [...unique].sort((first, second) => first.localeCompare(second));
}
