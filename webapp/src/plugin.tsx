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

		registry.registerChannelHeaderButtonAction(FlameIcon, openCampfire, 'Open Campfire', 'Open Campfire');
	}

	/**
	 * Uninitializes Campfire.
	 *
	 * Phase 0 does not register long-lived external resources here.
	 */
	public uninitialize(): void {
		return;
	}
}
