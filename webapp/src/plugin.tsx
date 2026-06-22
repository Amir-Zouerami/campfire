import type { ReactElement } from 'react';

import { CampfireRoot } from './app/CampfireRoot';
import { CampfireQueryProvider } from './query';
import { openCampfire } from './app/events';
import { setMattermostHostStore } from './app/mattermostHost';
import type {
	MattermostChannel,
	MattermostPluginRegistry,
	MattermostStore,
	MattermostWebappPlugin,
	PluginIconProps,
} from './types/mattermost';

const campfireAppBarIconURL = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="ember" x1="24" x2="104" y1="20" y2="112" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="0.5" stop-color="#fb923c"/>
      <stop offset="1" stop-color="#ef4444"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="30" fill="#0f172a"/>
  <circle cx="64" cy="70" r="44" fill="url(#ember)" opacity="0.18"/>
  <text x="64" y="86" text-anchor="middle" font-size="72">🔥</text>
</svg>
`)}`;

/**
 * FlameIcon is the Campfire entrypoint icon shown in Mattermost.
 */
function FlameIcon(props: PluginIconProps): ReactElement {
	return (
		<span className={props.className} aria-hidden="true">
			🔥
		</span>
	);
}


/**
 * CampfirePluginRoot wires application-wide frontend infrastructure.
 *
 * Keeping providers outside CampfireRoot lets feature code use query hooks
 * without coupling the Mattermost plugin registration class to React state.
 */
function CampfirePluginRoot(): ReactElement {
	return (
		<CampfireQueryProvider>
			<CampfireRoot />
		</CampfireQueryProvider>
	);
}

/**
 * channelDisplayName resolves a stable label from the Mattermost channel object passed by the header action.
 */
function channelDisplayName(channel: MattermostChannel | undefined): string | undefined {
	const value = channel?.display_name ?? channel?.displayName ?? channel?.name;

	return cleanOptionalString(value);
}

/**
 * channelTeamID resolves the team identifier from the Mattermost channel object passed by the header action.
 */
function channelTeamID(channel: MattermostChannel | undefined): string | undefined {
	return cleanOptionalString(channel?.team_id ?? channel?.teamId);
}

/**
 * cleanOptionalString removes blank strings from optional event payload fields.
 */
function cleanOptionalString(value: string | undefined): string | undefined {
	const cleanValue = value?.trim() ?? '';

	return cleanValue === '' ? undefined : cleanValue;
}

/**
 * CampfirePlugin is the Mattermost webapp plugin class.
 */
export class CampfirePlugin implements MattermostWebappPlugin {
	/**
	 * Initializes Campfire inside the Mattermost webapp.
	 */
	public initialize(registry: MattermostPluginRegistry, store: MattermostStore): void {
		setMattermostHostStore(store);

		registry.registerRootComponent(CampfirePluginRoot);

		registry.registerChannelHeaderButtonAction(
			<FlameIcon />,
			(channel?: MattermostChannel) => {
				openCampfire({
					channelID: channel?.id,
					channelName: channelDisplayName(channel),
					channelType: channel?.type,
					teamID: channelTeamID(channel),
				});
			},
			'Open Campfire',
			'Open Campfire',
		);

		registry.registerAppBarComponent?.(campfireAppBarIconURL, () => openCampfire(), 'Open Campfire');
	}

	/**
	 * Uninitializes Campfire.
	 */
	public uninitialize(): void {
		return;
	}
}
