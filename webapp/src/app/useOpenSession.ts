import { useEffect, useState } from 'react';

import { getHostStore } from '@/shared/host/hostStore';
import { readHostContext, subscribeToHostContext } from '@/shared/host/hostContext';
import type { HostContext } from '@/shared/host/hostContext';
import { launcher } from '@/shared/host/launcher';
import type { LaunchDetail } from '@/shared/host/launcher';

/**
 * mergeContext combines an explicit launch target with the channel Mattermost is showing.
 * An explicit channel (from a channel-header click) wins; its missing details come from
 * Mattermost only when it is the channel currently on screen.
 */
function mergeContext(detail: LaunchDetail): HostContext {
	const host = readHostContext(getHostStore());
	const channelID = detail.channelID?.trim() || null;
	const sameChannel = channelID === null || channelID === host.channelID;

	return {
		channelID: channelID ?? host.channelID,
		channelName: detail.channelName?.trim() || (sameChannel ? host.channelName : null),
		channelType: detail.channelType?.trim() || (sameChannel ? host.channelType : null),
		teamID: detail.teamID?.trim() || (sameChannel ? host.teamID : null),
	};
}

/**
 * useOpenSession tracks whether the Campfire window is open and which Mattermost channel it
 * is for. The window follows the user: switching channels in Mattermost retargets it.
 */
export function useOpenSession(): { readonly context: HostContext | null; readonly close: () => void } {
	const [context, setContext] = useState<HostContext | null>(null);

	useEffect(() => {
		return launcher.subscribe(command => {
			switch (command.type) {
				case 'open':
					setContext(mergeContext(command.detail));
					break;
				case 'close':
					setContext(null);
					break;
				case 'toggle':
					setContext(current => (current === null ? mergeContext({}) : null));
					break;
			}
		});
	}, []);

	const isOpen = context !== null;
	useEffect(() => {
		const store = getHostStore();
		if (!isOpen || store === null) {
			return;
		}

		return subscribeToHostContext(store, setContext);
	}, [isOpen]);

	return { context, close: () => setContext(null) };
}
