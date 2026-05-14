import type { ReactElement } from 'react';

import { CampfireRoot } from './app/CampfireRoot';
import { openCampfire } from './app/events';
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
	public initialize(registry: MattermostPluginRegistry, _store: MattermostStore): void {
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
