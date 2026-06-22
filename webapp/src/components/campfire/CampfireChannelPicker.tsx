import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Hash, Loader2, Search, XCircle } from 'lucide-react';

import { ApiClientError, lookupChannels, searchChannels } from '@/api';
import { Button } from '@/components/ui/button';
import type { ChannelProfile } from '@/types/api';
import { useI18n } from '@/i18n';

/**
 * CampfireChannelPickerProps contains a team-scoped Mattermost channel picker.
 */
type CampfireChannelPickerProps = {
	readonly teamID: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly placeholder?: string;
	readonly onChange: (channelID: string) => void;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * CampfireChannelPicker lets admins search readable Mattermost channels and
 * still fall back to pasting a raw channel ID for private/unlisted channels.
 */
export function CampfireChannelPicker(props: CampfireChannelPickerProps): ReactElement {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<readonly ChannelProfile[]>([]);
	const [selectedChannel, setSelectedChannel] = useState<ChannelProfile | null>(null);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [message, setMessage] = useState('');
	const deferredQuery = useDeferredValue(query);
	const { t } = useI18n();

	useEffect(() => {
		let active = true;

		async function loadSelectedChannel(): Promise<void> {
			const cleanChannelID = props.value.trim();
			if (cleanChannelID === '') {
				setSelectedChannel(null);
				return;
			}

			try {
				const response = await lookupChannels([cleanChannelID]);
				if (!active) {
					return;
				}

				setSelectedChannel(response.channels[0] ?? null);
			} catch (error: unknown) {
				if (!active) {
					return;
				}

				setSelectedChannel(null);
				setMessage(errorToMessage(error, t('shared.channelPicker.searchError')));
			}
		}

		void loadSelectedChannel();

		return () => {
			active = false;
		};
	}, [props.value, t]);

	useEffect(() => {
		let active = true;
		const cleanQuery = deferredQuery.trim();

		if (cleanQuery === '') {
			setResults([]);
			setLoadState('idle');
			setMessage('');
			return () => {
				active = false;
			};
		}

		const timeoutID = window.setTimeout(() => {
			async function runSearch(): Promise<void> {
				setLoadState('loading');
				setMessage('');

				try {
					const response = await searchChannels(props.teamID, cleanQuery, 20);
					if (!active) {
						return;
					}

					setResults(response.channels);
					setLoadState('ready');
				} catch (error: unknown) {
					if (!active) {
						return;
					}

					setResults([]);
					setLoadState('error');
					setMessage(errorToMessage(error, t('shared.channelPicker.searchError')));
				}
			}

			void runSearch();
		}, 180);

		return () => {
			active = false;
			window.clearTimeout(timeoutID);
		};
	}, [deferredQuery, props.teamID, t]);

	const disabled = props.disabled === true || props.teamID.trim() === '';
	const cleanQuery = query.trim();
	const showResults = cleanQuery !== '' && results.length > 0;
	const canUseTypedChannelID = cleanQuery !== '' && cleanQuery !== props.value.trim();
	const selectedLabel = useMemo(() => {
		if (props.value.trim() === '') {
			return '';
		}

		return selectedChannel === null ? props.value : channelLabel(selectedChannel);
	}, [props.value, selectedChannel]);

	function chooseChannel(channel: ChannelProfile): void {
		props.onChange(channel.id);
		setSelectedChannel(channel);
		setQuery('');
		setResults([]);
	}

	function useTypedChannelID(): void {
		const rawValue = query.trim().replace(/^#/, '');
		if (rawValue === '') {
			return;
		}

		props.onChange(rawValue);
		setSelectedChannel(null);
		setQuery('');
		setResults([]);
	}

	return (
		<div className="campfire-channel-picker">
			<label className="campfire-channel-picker-search">
				<Search className="cf:size-4" aria-hidden="true" />
				<input
					type="search"
					disabled={disabled}
					placeholder={props.placeholder ?? t('shared.channelPicker.searchPlaceholder')}
					value={query}
					onChange={event => setQuery(event.currentTarget.value)}
				/>
				{loadState === 'loading' && <Loader2 className="cf:size-4 cf:animate-spin" aria-hidden="true" />}
			</label>

			{selectedLabel !== '' && (
				<div className="campfire-channel-picker-selected">
					<Hash className="cf:size-4" aria-hidden="true" />
					<span>
						<strong>{selectedLabel}</strong>
						<small>{props.value}</small>
					</span>
					<Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => props.onChange('')}>
						<XCircle className="cf:size-4" />
						{t('common.clear')}
					</Button>
				</div>
			)}

			{showResults && (
				<div className="campfire-channel-picker-results" role="listbox" aria-label={t('shared.channelPicker.resultsLabel')}>
					{results.map(channel => (
						<button
							key={channel.id}
							type="button"
							disabled={disabled}
							onClick={() => chooseChannel(channel)}
						>
							<span>{channelLabel(channel)}</span>
							<small>{channel.id}</small>
						</button>
					))}
				</div>
			)}

			{canUseTypedChannelID && (
				<button
					type="button"
					className="campfire-channel-picker-manual"
					disabled={disabled}
					onClick={useTypedChannelID}
				>
					<Hash className="cf:size-4" aria-hidden="true" />
					<span>
						{t('shared.channelPicker.useTypedChannel', { channelId: cleanQuery })}
						<small>{t('shared.channelPicker.useTypedChannel.description')}</small>
					</span>
				</button>
			)}

			{cleanQuery !== '' && loadState === 'ready' && results.length === 0 && (
				<p className="campfire-channel-picker-message">{t('shared.channelPicker.noResults')}</p>
			)}

			{message !== '' && <p className="campfire-channel-picker-message campfire-channel-picker-message--error">{message}</p>}
		</div>
	);
}

/**
 * channelLabel builds a readable channel label with team and internal channel name.
 */
function channelLabel(channel: ChannelProfile): string {
	const displayName = channel.displayName.trim();
	const name = channel.name.trim();
	const teamName = channel.teamName.trim();
	const primary = displayName === '' ? name : displayName;
	const channelName = name === '' ? channel.id : `~${name}`;
	const teamPrefix = teamName === '' ? '' : `${teamName} / `;

	return `${teamPrefix}${primary} (${channelName})`;
}

/**
 * errorToMessage converts unknown errors to safe picker text.
 */
function errorToMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
}
