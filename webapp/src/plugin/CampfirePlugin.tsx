import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

import logoURL from '@assets/campfire-logo.svg';

import { CampfireRoot } from '@/app/CampfireRoot';

import { openCampfire } from '@/shared/host/launcher';
import type { MattermostChannel, MattermostPluginRegistry, MattermostStore, MattermostWebappPlugin } from '@/shared/host/mattermost';
import { setHostStore } from '@/shared/host/hostStore';

const LABEL = 'Open Campfire';

/**
 * CampfirePlugin registers Campfire's entry points with the Mattermost webapp.
 */
export class CampfirePlugin implements MattermostWebappPlugin {
	/**
	 * initialize is called by Mattermost once the plugin bundle has loaded.
	 */
	public initialize(registry: MattermostPluginRegistry, store: MattermostStore): void {
		setHostStore(store);

		registry.registerRootComponent(CampfireRoot);
		registry.registerChannelHeaderButtonAction(<HeaderIcon />, openFromHeader, LABEL, LABEL);
		registry.registerAppBarComponent?.(logoURL, () => openCampfire(), LABEL);
	}

	/**
	 * uninitialize is called when the plugin is disabled; Mattermost removes the registrations.
	 */
	public uninitialize(): void {
		setHostStore(null);
	}
}

/**
 * HeaderIcon is the monochrome channel-header glyph.
 */
function HeaderIcon(): ReactElement {
	return <Flame size={18} aria-hidden="true" />;
}

/**
 * openFromHeader opens Campfire for the channel whose header button was clicked.
 */
function openFromHeader(channel?: MattermostChannel): void {
	openCampfire({
		channelID: channel?.id,
		channelName: channel?.display_name ?? channel?.displayName ?? channel?.name,
		channelType: channel?.type,
		teamID: channel?.team_id ?? channel?.teamId,
	});
}
