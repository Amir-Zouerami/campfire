import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';

import { Combobox } from './Combobox';
import type { ComboboxOption } from './Combobox';

const TIMEZONE_OPTIONS: readonly ComboboxOption[] = (() => {
	try {
		return ['UTC', ...Intl.supportedValuesOf('timeZone')].map(zone => ({ value: zone, label: zone }));
	} catch {
		return [{ value: 'UTC', label: 'UTC' }];
	}
})();

type TimezoneSelectProps = {
	readonly value: string;
	readonly onChange: (timezone: string) => void;
	readonly disabled?: boolean;
	readonly onBlur?: () => void;
};

/**
 * TimezoneSelect chooses an IANA timezone from the browser's supported list.
 */
export function TimezoneSelect(props: TimezoneSelectProps): ReactElement {
	const { t } = useI18n();

	return (
		<Combobox
			value={props.value}
			onChange={props.onChange}
			options={TIMEZONE_OPTIONS}
			selectedOption={props.value === '' ? undefined : { value: props.value, label: props.value }}
			placeholder={t('shared.timezoneSelect.searchPlaceholder')}
			emptyText={t('common.none')}
			disabled={props.disabled}
			label={t('shared.timezoneSelect.searchPlaceholder')}
			onBlur={props.onBlur}
		/>
	);
}
