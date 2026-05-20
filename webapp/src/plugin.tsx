import type { ReactElement } from 'react';

import { openCampfire } from './app/events';
import { CampfireRoot } from './app/CampfireRoot';
import { setMattermostHostStore } from './app/mattermostHost';

import type {
	MattermostPluginRegistry,
	MattermostStore,
	MattermostWebappPlugin,
	PluginIconProps,
} from './types/mattermost';

const campfireAppBarIconURL = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#111827"/>
  <text x="64" y="82" text-anchor="middle" font-size="70">🔥</text>
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
 * CampfirePlugin is the Mattermost webapp plugin class.
 */
export class CampfirePlugin implements MattermostWebappPlugin {
	/**
	 * Initializes Campfire inside the Mattermost webapp.
	 */
	public initialize(registry: MattermostPluginRegistry, store: MattermostStore): void {
		setMattermostHostStore(store);

		registry.registerRootComponent(CampfireRoot);

		registry.registerChannelHeaderButtonAction(
			<FlameIcon />,
			() => openCampfire(),
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
