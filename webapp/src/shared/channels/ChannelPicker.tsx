import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import type { ReactElement } from 'react';

import { lookupChannels, searchChannels } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Combobox } from '@/shared/ui';
import type { ComboboxOption } from '@/shared/ui';
import type { ChannelProfile } from '@/shared/types/api';

/**
 * CHANNEL_ID_PATTERN matches a Mattermost channel ID (26 lowercase alphanumerics).
 */
const CHANNEL_ID_PATTERN = /^[a-z0-9]{26}$/;

function toOption(channel: ChannelProfile): ComboboxOption {
	return { value: channel.id, label: channel.displayName === '' ? channel.name : channel.displayName, description: channel.teamName };
}

type ChannelPickerProps = {
	readonly teamID: string;
	readonly value: string;
	readonly onChange: (channelID: string) => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly clearable?: boolean;
	readonly label?: string;
};

/**
 * ChannelPicker searches Mattermost channels in a team. Private channels that do not appear
 * in search can still be chosen by pasting their channel ID.
 */
export function ChannelPicker(props: ChannelPickerProps): ReactElement {
	const { t } = useI18n();
	const [term, setTerm] = useState('');
	const search = useDeferredValue(term.trim());

	const results = useQuery({
		queryKey: ['campfire', 'channels', 'search', props.teamID, search],
		queryFn: () => searchChannels(props.teamID, search, 20),
		enabled: props.teamID !== '' && search.length >= 2,
		staleTime: 30_000,
	});

	const selected = useQuery({
		queryKey: ['campfire', 'channels', 'lookup', props.value],
		queryFn: () => lookupChannels([props.value]),
		enabled: props.value !== '',
		staleTime: Infinity,
	});

	const options = (results.data?.channels ?? []).map(toOption);
	if (CHANNEL_ID_PATTERN.test(search) && !options.some(option => option.value === search)) {
		options.push({
			value: search,
			label: t('shared.channelPicker.useTypedChannel', { channelId: search }),
			description: t('shared.channelPicker.useTypedChannel.description'),
		});
	}

	const selectedChannel = selected.data?.channels[0];

	return (
		<Combobox
			value={props.value}
			onChange={props.onChange}
			options={options}
			selectedOption={
				props.value === ''
					? undefined
					: selectedChannel === undefined
						? { value: props.value, label: props.value }
						: toOption(selectedChannel)
			}
			onSearch={setTerm}
			loading={results.isFetching}
			placeholder={props.placeholder ?? t('shared.channelPicker.searchPlaceholder')}
			emptyText={results.isError ? t('shared.channelPicker.searchError') : t('shared.channelPicker.noResults')}
			disabled={props.disabled}
			clearable={props.clearable}
			label={props.label ?? t('shared.channelPicker.searchPlaceholder')}
		/>
	);
}
